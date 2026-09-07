import { useEffect, useState } from "react";
import { ArrowLeft, Building2, CheckCircle2, MapPin, ShieldCheck, Sparkles } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import api from "../api/client.js";
import Loading from "../components/Loading.jsx";
import Badge from "../components/Badge.jsx";

export default function StartupProfile() {
  const { startupId } = useParams();
  const [startup, setStartup] = useState(null);
  const [challenges, setChallenges] = useState([]);
  const [eligibility, setEligibility] = useState(null);
  const [challengeId, setChallengeId] = useState("");
  const [checking, setChecking] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    Promise.all([api.getStartup(startupId), api.getChallenges()])
      .then(async ([startupData, challengeList]) => {
        setStartup(startupData);
        const matched = await Promise.all(challengeList.map(async (challenge) => {
          try {
            const result = await api.matchForChallenge(challenge.challenge_id, 10);
            const match = result.results.find((item) => item.startup.startup_id === startupId);
            return match ? { challenge, match } : null;
          } catch {
            return null;
          }
        }));
        setChallenges(matched.filter(Boolean));
      })
      .catch((requestError) => setError(requestError.response?.data?.detail || requestError.message))
      .finally(() => setLoading(false));
  }, [startupId]);

  const checkEligibility = async () => {
    if (!challengeId) return;
    setChecking(true);
    try {
      setEligibility(await api.checkEligibility(challengeId, startupId));
    } catch (requestError) {
      setError(requestError.response?.data?.detail || requestError.message);
    } finally {
      setChecking(false);
    }
  };

  if (loading) return <ProfileSkeleton />;
  if (error && !startup) return <div className="card border-red-200 bg-red-50 p-6 text-sm text-red-700">Unable to load startup: {error}</div>;
  if (!startup) return null;

  return <div className="page-shell">
    <Link to="/startups" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-[#d95300]"><ArrowLeft className="h-4 w-4" /> Back to Startup Discovery</Link>
    <div className="card p-6"><div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between"><div><div className="section-label">Startup Profile</div><h1 className="mt-2 text-3xl font-black tracking-[-0.045em] text-[#0b2d4a] md:text-4xl">{startup.company_name}</h1><div className="mt-2 flex flex-wrap gap-4 text-sm text-slate-500"><span className="inline-flex items-center gap-1.5"><MapPin className="h-4 w-4" />{startup.headquarters || "Location not provided"}</span><span className="inline-flex items-center gap-1.5"><Building2 className="h-4 w-4" />{startup.funding_stage || "Funding stage not provided"}</span></div></div><Badge status={startup.government_experience ? "ELIGIBLE" : "SUBMITTED"}>{startup.government_experience ? "Government experience" : "No government experience"}</Badge></div><p className="mt-6 max-w-4xl text-sm leading-7 text-slate-600">{startup.description || "No company overview provided."}</p></div>
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"><ProfileField label="TRL level" value={startup.trl_level} /><ProfileField label="Operating regions" value={(startup.operating_regions || []).join(", ")} /><ProfileField label="Team size" value={startup.team_size ? `${startup.team_size} team members` : null} /><ProfileField label="Previous projects" value={startup.previous_pilots ? `${startup.previous_pilots} previous pilots` : null} /><ProfileField label="Deployment capacity" value={startup.deployment_capacity} /><ProfileField label="Certifications" value={(startup.certifications || []).join(", ")} /></div>
    <div className="grid gap-6 xl:grid-cols-2"><ProfileList title="Sectors" items={startup.sectors} /><ProfileList title="Technologies" items={startup.technologies} /><ProfileList title="Capabilities" items={startup.capabilities} /><ProfileList title="Products" items={startup.products} /></div>
    <div className="card p-6"><div className="section-label">Eligibility</div><h2 className="mt-1 text-xl font-black text-[#0b2d4a]">Check eligibility for a challenge</h2><div className="mt-4 flex flex-col gap-2 sm:flex-row"><select className="filter-control min-w-64" value={challengeId} onChange={(event) => setChallengeId(event.target.value)}><option value="">Select Challenge</option>{challenges.map(({ challenge }) => <option key={challenge.challenge_id} value={challenge.challenge_id}>{challenge.title}</option>)}</select><button className="btn-primary" onClick={checkEligibility} disabled={!challengeId || checking}><ShieldCheck className="h-4 w-4" />{checking ? "Checking..." : "Check Eligibility"}</button></div>{eligibility && <div className="mt-5 rounded-xl border border-green-200 bg-green-50 p-4"><div className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-green-700" /><Badge status={eligibility.verdict} /></div><ul className="mt-3 space-y-1 text-sm text-green-900">{eligibility.explanations.map((item, index) => <li key={index}>{item}</li>)}</ul></div>}</div>
    <div><div className="section-label">Relevant MAITRI Challenges</div><h2 className="mt-1 text-xl font-black text-[#0b2d4a]">Matched opportunities</h2>{challenges.length ? <div className="mt-4 grid gap-4 md:grid-cols-2">{challenges.map(({ challenge, match }) => <Link to={`/challenges/${challenge.challenge_id}`} className="card block p-5 transition hover:border-orange-200" key={challenge.challenge_id}><div className="flex items-start justify-between gap-3"><h3 className="font-bold text-[#0b2d4a]">{challenge.title}</h3><span className="text-sm font-black text-[#d95300]">{match.match_score}%</span></div><p className="mt-2 text-sm text-slate-600">{challenge.description}</p><div className="mt-4 flex items-center gap-2 text-xs text-slate-500"><Sparkles className="h-3.5 w-3.5 text-[#ff6b0a]" />{match.matching_technologies?.join(", ") || "Semantic match returned"}</div></Link>)}</div> : <div className="empty-state mt-4">No relevant challenges were returned by the matching service.</div>}</div>
  </div>;
}

function ProfileField({ label, value }) { return <div className="card p-5"><div className="text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</div><div className="mt-2 text-sm font-semibold text-slate-700">{value || "Not provided by API"}</div></div>; }
function ProfileList({ title, items = [] }) { return <div className="card p-5"><h2 className="text-base font-black text-[#0b2d4a]">{title}</h2><div className="mt-3 flex flex-wrap gap-2">{items.length ? items.map((item) => <span className="tag" key={item}>{item}</span>) : <span className="text-sm text-slate-400">Not provided by API</span>}</div></div>; }
function ProfileSkeleton() { return <div className="page-shell animate-pulse"><div className="h-8 w-48 rounded bg-slate-200" /><div className="h-56 rounded-2xl bg-slate-200" /><div className="grid gap-4 md:grid-cols-3"><div className="h-28 rounded-2xl bg-slate-200" /><div className="h-28 rounded-2xl bg-slate-200" /><div className="h-28 rounded-2xl bg-slate-200" /></div></div>; }
