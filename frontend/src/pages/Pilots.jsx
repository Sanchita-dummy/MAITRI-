import { useEffect, useMemo, useState } from "react";
import { ArrowRight, MapPin, Search, ShieldAlert, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import api from "../api/client.js";
import Loading from "../components/Loading.jsx";
import Badge from "../components/Badge.jsx";

const STATUSES = ["PLANNED", "ACTIVE", "COMPLETED", "FAILED", "SCALED"];

export default function Pilots() {
  const [pilots, setPilots] = useState([]);
  const [kpis, setKpis] = useState({});
  const [startups, setStartups] = useState([]);
  const [challenges, setChallenges] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [filters, setFilters] = useState({ query: "", department: "ALL", sector: "ALL", status: "ALL" });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    Promise.all([api.getPilots(), api.getStartups(), api.getChallenges(), api.getDepartments()])
      .then(async ([pilotList, startupList, challengeList, departmentList]) => {
        setPilots(pilotList); setStartups(startupList); setChallenges(challengeList); setDepartments(departmentList);
        const kpiEntries = await Promise.all(pilotList.map(async (pilot) => [pilot.pilot_id, await api.getPilotKpis(pilot.pilot_id)]));
        setKpis(Object.fromEntries(kpiEntries));
      })
      .catch((requestError) => setError(requestError.response?.data?.detail || requestError.message))
      .finally(() => setLoading(false));
  }, []);

  const sectors = useMemo(() => [...new Set(challenges.map((challenge) => challenge.sector).filter(Boolean))], [challenges]);
  const filtered = useMemo(() => pilots.map((pilot) => ({ pilot, startup: startups.find((item) => item.startup_id === pilot.startup_id), challenge: challenges.find((item) => item.challenge_id === pilot.challenge_id), department: departments.find((item) => item.department_id === pilot.department_id), pilotKpis: kpis[pilot.pilot_id] || [] })).filter(({ pilot, startup, challenge, department }) => { const search = [pilot.pilot_id, pilot.location, startup?.company_name, challenge?.title, department?.name].join(" ").toLowerCase(); return (!filters.query || search.includes(filters.query.toLowerCase())) && (filters.department === "ALL" || pilot.department_id === filters.department) && (filters.sector === "ALL" || challenge?.sector === filters.sector) && (filters.status === "ALL" || pilot.status === filters.status); }), [challenges, departments, filters, kpis, pilots, startups]);

  if (loading) return <PilotSkeleton />;
  if (error) return <div className="card border-red-200 bg-red-50 p-6 text-sm text-red-700">Unable to load pilots: {error}</div>;
  const active = pilots.filter((pilot) => pilot.status === "ACTIVE").length;
  const planned = pilots.filter((pilot) => pilot.status === "PLANNED").length;
  const completed = pilots.filter((pilot) => pilot.status === "COMPLETED").length;
  const atRisk = pilots.filter((pilot) => (kpis[pilot.pilot_id] || []).some((kpi) => kpi.status === "AT_RISK")).length;
  const scaleCandidates = pilots.filter((pilot) => pilot.scale_recommendation === "SCALE" || pilot.status === "SCALED").length;

  return <div className="page-shell"><div className="page-intro"><div><div className="section-label">Impact Delivery</div><h1>Pilot Programs</h1><p>Track real-world deployment, milestones and measurable outcomes of selected startup solutions.</p></div></div><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5"><Summary label="Active Pilots" value={active} /><Summary label="Planned Pilots" value={planned} /><Summary label="Completed Pilots" value={completed} /><Summary label="At Risk" value={atRisk} warning /><Summary label="Scale-up Candidates" value={scaleCandidates} /></div><div className="card grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-4"><div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input className="input-shell pl-9" placeholder="Search pilots" value={filters.query} onChange={(event) => setFilters({ ...filters, query: event.target.value })} /></div><Select label="Department" value={filters.department} options={departments.map((item) => [item.department_id, item.name])} onChange={(value) => setFilters({ ...filters, department: value })} /><Select label="Sector" value={filters.sector} options={sectors.map((value) => [value, value])} onChange={(value) => setFilters({ ...filters, sector: value })} /><Select label="Status" value={filters.status} options={STATUSES.map((value) => [value, value])} onChange={(value) => setFilters({ ...filters, status: value })} /></div><div className="flex items-center justify-between"><div className="section-label">{filtered.length} pilot programs</div><div className="text-xs text-slate-400">Updated from live MAITRI data</div></div><div className="grid gap-4 xl:grid-cols-2">{filtered.map(({ pilot, startup, challenge, department, pilotKpis }) => <PilotCard key={pilot.pilot_id} pilot={pilot} startup={startup} challenge={challenge} department={department} kpis={pilotKpis} />)}</div>{!filtered.length && <div className="empty-state">No pilot programs match the selected filters.</div>}</div>;
}

function PilotCard({ pilot, startup, challenge, department, kpis }) { const average = kpis.length ? (kpis.reduce((total, kpi) => total + kpi.achievement_percentage, 0) / kpis.length).toFixed(1) : null; return <Link to={`/pilots/${pilot.pilot_id}`} className="card group block p-5 transition hover:-translate-y-0.5 hover:border-orange-200"><div className="flex items-start justify-between gap-3"><div><div className="section-label">{pilot.pilot_id}</div><h2 className="mt-1 text-xl font-black text-[#0b2d4a] group-hover:text-[#d95300]">{pilot.location || "Pilot program"}</h2><div className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-sm text-slate-500"><span>{startup?.company_name || pilot.startup_id}</span><span>{challenge?.title || pilot.challenge_id}</span><span>{department?.name || pilot.department_id}</span></div></div><Badge status={pilot.status} /></div><div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-500"><span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{pilot.location || "Location not provided"}</span><span>Start {new Date(pilot.start_date).toLocaleDateString()}</span><span>End {endDate(pilot.start_date, pilot.duration_months)}</span></div><div className="mt-5 grid grid-cols-3 gap-3 border-t border-slate-100 pt-4"><Metric label="Progress" value={`${progress(pilot)}%`} /><Metric label="KPI achievement" value={average ? `${average}%` : "Not recorded"} /><Metric label="Current stage" value={stage(pilot.status)} /></div><div className="mt-4 flex items-center justify-end text-sm font-bold text-[#d95300]">Open pilot workspace <ArrowRight className="ml-2 h-4 w-4 transition group-hover:translate-x-1" /></div></Link>; }
function Summary({ label, value, warning }) { return <div className="card p-5"><div className="flex items-center justify-between"><div className="text-3xl font-black tracking-[-0.05em] text-[#0b2d4a]">{value}</div>{warning && <ShieldAlert className="h-5 w-5 text-amber-500" />}</div><div className="mt-2 text-xs font-semibold text-slate-500">{label}</div></div>; }
function Metric({ label, value }) { return <div><div className="text-[11px] uppercase tracking-wider text-slate-400">{label}</div><div className="mt-1 text-sm font-bold text-slate-700">{value}</div></div>; }
function Select({ label, value, options, onChange }) { return <select className="filter-control" aria-label={label} value={value} onChange={(event) => onChange(event.target.value)}><option value="ALL">{label}</option>{options.map(([optionValue, optionLabel]) => <option key={optionValue} value={optionValue}>{optionLabel}</option>)}</select>; }
function stage(status) { return status === "PLANNED" ? "Pilot planned" : status === "ACTIVE" ? "Pilot" : status === "COMPLETED" ? "Validation" : status === "SCALED" ? "Scale-up" : "Review"; }
function progress(pilot) { return pilot.milestones?.length ? Math.round((pilot.milestones.filter((milestone) => milestone.done).length / pilot.milestones.length) * 100) : 0; }
function endDate(startDate, duration) { const date = new Date(startDate); date.setMonth(date.getMonth() + (duration || 0)); return date.toLocaleDateString(); }
function PilotSkeleton() { return <div className="page-shell animate-pulse"><div className="h-24 rounded-2xl bg-slate-200" /><div className="grid gap-4 sm:grid-cols-5"><div className="h-28 rounded-2xl bg-slate-200" /><div className="h-28 rounded-2xl bg-slate-200" /><div className="h-28 rounded-2xl bg-slate-200" /><div className="h-28 rounded-2xl bg-slate-200" /><div className="h-28 rounded-2xl bg-slate-200" /></div><div className="h-72 rounded-2xl bg-slate-200" /></div>; }
