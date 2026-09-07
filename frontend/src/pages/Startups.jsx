import { useEffect, useMemo, useState } from "react";
import { ArrowRight, CheckCircle2, ChevronDown, MapPin, Search, ShieldCheck, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import api from "../api/client.js";
import Loading from "../components/Loading.jsx";
import Badge from "../components/Badge.jsx";

const unique = (values) => [...new Set(values)];

export default function Startups() {
  const [startups, setStartups] = useState([]);
  const [challenges, setChallenges] = useState([]);
  const [matches, setMatches] = useState(null);
  const [filters, setFilters] = useState({ query: "", sector: "ALL", technology: "ALL", trl: "ALL", location: "ALL" });
  const [challengeId, setChallengeId] = useState("");
  const [loading, setLoading] = useState(true);
  const [matching, setMatching] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    Promise.all([api.getStartups(), api.getChallenges()])
      .then(([startupList, challengeList]) => {
        setStartups(startupList);
        setChallenges(challengeList);
        setChallengeId(challengeList[0]?.challenge_id || "");
      })
      .catch((requestError) => setError(requestError.response?.data?.detail || requestError.message))
      .finally(() => setLoading(false));
  }, []);

  const options = useMemo(() => ({
    sectors: unique(startups.flatMap((startup) => startup.sectors || [])),
    technologies: unique(startups.flatMap((startup) => startup.technologies || [])),
    locations: unique(startups.map((startup) => startup.headquarters).filter(Boolean)),
    trls: unique(startups.map((startup) => startup.trl_level).filter((value) => value != null).sort((a, b) => a - b)),
  }), [startups]);

  const filtered = useMemo(() => startups.filter((startup) => {
    const searchText = [startup.company_name, startup.description, ...(startup.sectors || []), ...(startup.technologies || [])].join(" ").toLowerCase();
    const queryMatches = !filters.query || searchText.includes(filters.query.toLowerCase());
    return queryMatches && (filters.sector === "ALL" || startup.sectors?.includes(filters.sector)) &&
      (filters.technology === "ALL" || startup.technologies?.includes(filters.technology)) &&
      (filters.trl === "ALL" || String(startup.trl_level) === filters.trl) &&
      (filters.location === "ALL" || startup.headquarters === filters.location);
  }), [filters, startups]);

  const findMatches = async () => {
    if (!challengeId) return;
    setMatching(true);
    setError(null);
    try {
      const response = await api.matchForChallenge(challengeId, 10);
      setMatches(response.results);
    } catch (requestError) {
      setError(requestError.response?.data?.detail || requestError.message);
    } finally {
      setMatching(false);
    }
  };

  if (loading) return <StartupSkeleton />;
  if (error && !startups.length) return <div className="card border-red-200 bg-red-50 p-6 text-sm text-red-700">Unable to load startups: {error}</div>;

  return <div className="page-shell">
    <div className="page-intro"><div><div className="section-label">Ecosystem Network</div><h1>Startup Discovery</h1><p>Find the most relevant startups for government innovation challenges.</p></div></div>
    <div className="card grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-5">
      <div className="relative sm:col-span-2 xl:col-span-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input className="input-shell pl-9" placeholder="Search startups" value={filters.query} onChange={(event) => setFilters({ ...filters, query: event.target.value })} /></div>
      <Filter label="Sector" value={filters.sector} options={options.sectors} onChange={(value) => setFilters({ ...filters, sector: value })} />
      <Filter label="Technology" value={filters.technology} options={options.technologies} onChange={(value) => setFilters({ ...filters, technology: value })} />
      <Filter label="TRL" value={filters.trl} options={options.trls} onChange={(value) => setFilters({ ...filters, trl: value })} />
      <Filter label="Location" value={filters.location} options={options.locations} onChange={(value) => setFilters({ ...filters, location: value })} />
    </div>
    <div className="card border-orange-200 bg-[#fffaf5] p-5"><div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><div className="section-label">Semantic Matching</div><h2 className="mt-1 text-xl font-black text-[#0b2d4a]">Find startups for a challenge</h2><p className="mt-1 text-sm text-slate-500">Ranked recommendations come from the ChromaDB matching service.</p></div><div className="flex w-full flex-col gap-2 sm:flex-row lg:w-auto"><select className="filter-control min-w-64" value={challengeId} onChange={(event) => setChallengeId(event.target.value)}><option value="">Select Challenge</option>{challenges.map((challenge) => <option key={challenge.challenge_id} value={challenge.challenge_id}>{challenge.title}</option>)}</select><button className="btn-primary" onClick={findMatches} disabled={!challengeId || matching}><Sparkles className="h-4 w-4" />{matching ? "Finding..." : "Find Matches"}</button></div></div>{matches && <MatchResults matches={matches} challengeId={challengeId} />}{!matches && !challenges.length && <div className="empty-state mt-5">Create a challenge before running startup matching.</div>}</div>
    {error && <div className="card border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
    <div className="flex items-center justify-between"><div className="section-label">{filtered.length} startups</div><div className="text-xs text-slate-400">Updated from live MAITRI data</div></div>
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{filtered.map((startup) => <StartupCard key={startup.startup_id} startup={startup} />)}</div>
    {!filtered.length && <div className="empty-state">No startups match the selected filters.</div>}
  </div>;
}

function StartupCard({ startup }) {
  return <div className="card flex flex-col p-5"><div className="flex items-start justify-between gap-3"><div><h2 className="text-lg font-black text-[#0b2d4a]">{startup.company_name}</h2><div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500"><MapPin className="h-3.5 w-3.5" />{startup.headquarters || "Location not provided"}</div></div><Badge status={startup.government_experience ? "ELIGIBLE" : "SUBMITTED"}>{startup.government_experience ? "Government experience" : "Profile"}</Badge></div><p className="mt-4 line-clamp-3 text-sm leading-6 text-slate-600">{startup.description || "No description provided."}</p><div className="mt-4 flex flex-wrap gap-2">{(startup.sectors || []).map((item) => <span className="tag bg-[#fff3eb] text-[#d95300]" key={item}>{item}</span>)}{(startup.technologies || []).slice(0, 3).map((item) => <span className="tag" key={item}>{item}</span>)}</div><div className="mt-5 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4 text-xs"><Metric label="TRL" value={startup.trl_level ?? "Not provided"} /><Metric label="Previous pilots" value={startup.previous_pilots ?? 0} /></div><Link className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-[#e85d04]" to={`/startups/${startup.startup_id}`}>View Profile <ArrowRight className="h-4 w-4" /></Link></div>;
}

function MatchResults({ matches, challengeId }) {
  const [expanded, setExpanded] = useState(null);
  const [eligibility, setEligibility] = useState({});
  const [eligibilityErrors, setEligibilityErrors] = useState({});
  const [checking, setChecking] = useState(null);
  const checkEligibility = async (startupId) => { setChecking(startupId); try { const result = await api.checkEligibility(challengeId, startupId); setEligibility((current) => ({ ...current, [startupId]: result })); setEligibilityErrors((current) => ({ ...current, [startupId]: null })); } catch (requestError) { setEligibilityErrors((current) => ({ ...current, [startupId]: requestError.response?.data?.detail || requestError.message })); } finally { setChecking(null); } };
  if (!matches.length) return <div className="empty-state mt-5">No matching startups were returned for this challenge.</div>;
  return <div className="mt-5 space-y-3">{matches.map((match) => { const startup = match.startup; const result = eligibility[startup.startup_id]; const eligibilityError = eligibilityErrors[startup.startup_id]; return <div className="rounded-xl border border-slate-200 bg-white p-4" key={startup.startup_id}><div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between"><div><div className="flex flex-wrap items-center gap-2"><h3 className="font-bold text-[#0b2d4a]">{startup.company_name}</h3><span className="rounded-full bg-[#fff3eb] px-2.5 py-1 text-xs font-black text-[#d95300]">{match.match_score}% match</span></div><p className="mt-1 text-sm text-slate-600">{startup.description || "No description provided."}</p><div className="mt-3 flex flex-wrap gap-2">{(startup.sectors || []).map((item) => <span className="tag" key={item}>{item}</span>)}{(startup.technologies || []).map((item) => <span className="tag bg-slate-50" key={item}>{item}</span>)}</div></div><div className="flex shrink-0 gap-2"><Link className="btn-secondary" to={`/startups/${startup.startup_id}`}>View Profile</Link><button className="btn-primary" onClick={() => checkEligibility(startup.startup_id)} disabled={checking === startup.startup_id}><ShieldCheck className="h-4 w-4" />{checking === startup.startup_id ? "Checking..." : "Check Eligibility"}</button></div></div><div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-500"><span>TRL {startup.trl_level ?? "N/A"}</span><span>{startup.headquarters || "Location not provided"}</span><span>{startup.government_experience ? "Government experience" : "No government experience"}</span><span>{startup.previous_pilots ?? 0} previous pilots</span></div><button className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-[#0b2d4a]" onClick={() => setExpanded(expanded === startup.startup_id ? null : startup.startup_id)}><ChevronDown className={`h-4 w-4 transition ${expanded === startup.startup_id ? "rotate-180" : ""}`} />Why this matches</button>{expanded === startup.startup_id && <div className="mt-3 grid gap-3 rounded-lg bg-slate-50 p-4 text-sm sm:grid-cols-2"><Reason label="Matching capabilities" values={match.matching_capabilities} /><Reason label="Matching technologies" values={match.matching_technologies} /><Reason label="Relevant experience" values={[match.relevant_experience]} /><Reason label="Sector compatibility" values={startup.sectors} /><Reason label="TRL compatibility" values={[`TRL ${startup.trl_level ?? "not provided"}`]} warning={match.missing_requirements?.length > 0} /><Reason label="Missing requirements" values={match.missing_requirements} warning /></div>}{result && <div className="mt-3 rounded-lg border border-green-200 bg-green-50 p-3"><div className="flex items-center gap-2 font-bold text-green-800"><CheckCircle2 className="h-4 w-4" /><Badge status={result.verdict} /></div><ul className="mt-2 space-y-1 text-sm text-green-900">{result.explanations.map((item, index) => <li key={index}>{item}</li>)}</ul></div>}{eligibilityError && <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">Eligibility check failed: {eligibilityError}</div>}</div>; })}</div>;
}

function Reason({ label, values = [], warning = false }) { return <div><div className="font-semibold text-slate-500">{warning ? "Warning" : "Verified"}: {label}</div><div className="mt-1 text-slate-700">{values.length ? values.join(", ") : "None returned"}</div></div>; }
function Filter({ label, value, onChange, options }) { return <select className="filter-control w-full" aria-label={label} value={value} onChange={(event) => onChange(event.target.value)}><option value="ALL">{label}</option>{options.map((option) => <option key={option} value={option}>{option}</option>)}</select>; }
function Metric({ label, value }) { return <div><div className="text-[11px] uppercase tracking-wider text-slate-400">{label}</div><div className="mt-1 font-bold text-slate-700">{value}</div></div>; }
function StartupSkeleton() { return <div className="page-shell animate-pulse"><div className="h-24 rounded-2xl bg-slate-200" /><div className="h-20 rounded-2xl bg-slate-200" /><div className="grid gap-4 md:grid-cols-3"><div className="h-64 rounded-2xl bg-slate-200" /><div className="h-64 rounded-2xl bg-slate-200" /><div className="h-64 rounded-2xl bg-slate-200" /></div></div>; }
