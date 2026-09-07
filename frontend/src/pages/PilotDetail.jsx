import { useEffect, useState } from "react";
import { ArrowLeft, CheckCircle2, ExternalLink, RefreshCw, ShieldAlert, TrendingUp } from "lucide-react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Link, useNavigate, useParams } from "react-router-dom";
import api from "../api/client.js";
import Loading from "../components/Loading.jsx";
import Badge from "../components/Badge.jsx";

const lifecycle = ["Evaluation", "Approved", "Pilot", "Validation", "Procurement", "Scale-up"];

export default function PilotDetail() {
  const { pilotId } = useParams();
  const navigate = useNavigate();
  const [pilot, setPilot] = useState(null);
  const [kpis, setKpis] = useState([]);
  const [startup, setStartup] = useState(null);
  const [challenge, setChallenge] = useState(null);
  const [department, setDepartment] = useState(null);
  const [recommendation, setRecommendation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    Promise.all([api.getPilot(pilotId), api.getPilotKpis(pilotId), api.getStartups(), api.getChallenges(), api.getDepartments()])
      .then(([pilotData, kpiData, startupList, challengeList, departmentList]) => {
        setPilot(pilotData);
        setKpis(kpiData);
        setStartup(startupList.find((item) => item.startup_id === pilotData.startup_id));
        setChallenge(challengeList.find((item) => item.challenge_id === pilotData.challenge_id));
        setDepartment(departmentList.find((item) => item.department_id === pilotData.department_id));
      })
      .catch((requestError) => setError(requestError.response?.data?.detail || requestError.message))
      .finally(() => setLoading(false));
  }, [pilotId]);

  const updateStatus = async (status) => {
    setBusy(true);
    try { setPilot(await api.updatePilotStatus(pilotId, status)); } catch (requestError) { setError(requestError.response?.data?.detail || requestError.message); } finally { setBusy(false); }
  };

  const loadRecommendation = async () => {
    setBusy(true);
    try { setRecommendation(await api.getScaleRecommendation(pilotId)); } catch (requestError) { setError(requestError.response?.data?.detail || requestError.message); } finally { setBusy(false); }
  };

  if (loading) return <DetailSkeleton />;
  if (error && !pilot) return <div className="card border-red-200 bg-red-50 p-6 text-sm text-red-700">Unable to load pilot: {error}</div>;
  if (!pilot) return null;

  const currentStage = pilot.status === "COMPLETED" ? "Validation" : pilot.status === "SCALED" ? "Scale-up" : "Pilot";
  const average = kpis.length ? (kpis.reduce((sum, kpi) => sum + kpi.achievement_percentage, 0) / kpis.length).toFixed(1) : null;
  const health = kpis.some((kpi) => kpi.status === "AT_RISK") ? "At Risk" : kpis.length && kpis.every((kpi) => kpi.status === "MET") ? "On Track" : "Delayed";

  return <div className="page-shell">
    <Link to="/pilots" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-[#d95300]"><ArrowLeft className="h-4 w-4" /> Back to Pilot Programs</Link>
    {error && <div className="card border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-6">
        <section className="card p-6"><div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between"><div><div className="section-label">Pilot Workspace · {pilot.pilot_id}</div><h1 className="mt-2 text-3xl font-black text-[#0b2d4a] md:text-4xl">{pilot.location || "Pilot Program"}</h1><p className="mt-2 text-sm text-slate-500">{startup?.company_name || pilot.startup_id} · {challenge?.title || pilot.challenge_id} · {department?.name || pilot.department_id}</p></div><Badge status={pilot.status} /></div><div className="mt-6 grid gap-4 border-t border-slate-100 pt-5 sm:grid-cols-2 lg:grid-cols-4"><Field label="Location" value={pilot.location} /><Field label="Start date" value={new Date(pilot.start_date).toLocaleDateString()} /><Field label="End date" value={endDate(pilot.start_date, pilot.duration_months)} /><Field label="Duration" value={`${pilot.duration_months} months`} /></div></section>
        <section className="card p-6"><div className="section-label">Lifecycle</div><div className="mt-5 grid gap-3 sm:grid-cols-6">{lifecycle.map((item) => <div className={`rounded-xl border p-3 text-center text-xs font-bold ${item === currentStage ? "border-orange-200 bg-[#fff3eb] text-[#d95300]" : "border-slate-200 bg-slate-50 text-slate-500"}`} key={item}><div className={`mx-auto mb-2 h-2.5 w-2.5 rounded-full ${item === currentStage ? "bg-[#ff6b0a]" : "bg-slate-300"}`} />{item}</div>)}</div></section>
        <section className="card p-6"><h2 className="text-xl font-black text-[#0b2d4a]">Pilot overview</h2><div className="mt-5 grid gap-4 sm:grid-cols-2"><Field label="Problem being solved" value={challenge?.description} /><Field label="Proposed solution" value={null} /><Field label="Pilot objective" value={null} /><Field label="Budget / cost" value={null} /><Field label="Startup" value={startup?.company_name} /><Field label="Government department" value={department?.name} /></div></section>
        <section className="card p-6"><h2 className="text-xl font-black text-[#0b2d4a]">Milestones</h2>{pilot.milestones?.length ? <div className="mt-5 space-y-4">{pilot.milestones.map((item, index) => <div className="flex gap-4" key={`${item.title}-${index}`}><div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${item.done ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-400"}`}>{item.done ? <CheckCircle2 className="h-4 w-4" /> : index + 1}</div><div className="flex-1 border-b border-slate-100 pb-4"><div className="font-bold text-[#0b2d4a]">{item.title}</div><div className="mt-1 text-xs text-slate-500">{item.done ? "Completed" : "Pending"} · planned/completion dates not provided by API</div></div></div>)}</div> : <div className="empty-state mt-4">No milestones returned by the API.</div>}</section>
        <section className="card p-6"><div className="flex items-center justify-between"><div><div className="section-label">KPI / Impact</div><h2 className="mt-1 text-xl font-black text-[#0b2d4a]">Measured outcomes</h2></div>{average && <div className="text-right"><div className="text-2xl font-black text-[#d95300]">{average}%</div><div className="text-xs text-slate-400">Average achievement</div></div>}</div>{kpis.length ? <><div className="mt-5 h-64"><ResponsiveContainer width="100%" height="100%"><BarChart data={kpis} layout="vertical"><XAxis type="number" domain={[0, 130]} /><YAxis type="category" dataKey="metric" width={140} tick={{ fontSize: 11 }} /><Tooltip /><Bar dataKey="achievement_percentage" fill="#ff6b0a" /></BarChart></ResponsiveContainer></div><div className="mt-5 grid gap-3 sm:grid-cols-2">{kpis.map((kpi) => <div className="rounded-xl border border-slate-200 p-4" key={kpi.kpi_id}><div className="flex items-start justify-between gap-3"><div className="font-bold text-[#0b2d4a]">{kpi.metric}</div><Badge status={kpi.status} /></div><div className="mt-3 grid grid-cols-3 gap-2 text-xs text-slate-500"><Field label="Baseline" value={`${kpi.baseline}${kpi.unit}`} /><Field label="Target" value={`${kpi.target}${kpi.unit}`} /><Field label="Actual" value={`${kpi.actual}${kpi.unit}`} /></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-[#ff6b0a]" style={{ width: `${Math.min(kpi.achievement_percentage, 100)}%` }} /></div><div className="mt-1 text-right text-xs font-bold text-[#d95300]">{kpi.achievement_percentage}%</div></div>)}</div></> : <div className="empty-state mt-5">No KPI records are available for this pilot.</div>}</section>
        <section className="card p-6"><div className="flex items-start justify-between gap-4"><div><div className="section-label">Scale-up Readiness</div><h2 className="mt-1 text-xl font-black text-[#0b2d4a]">Recommendation</h2></div><button className="btn-primary" onClick={loadRecommendation} disabled={busy || !kpis.length}><TrendingUp className="h-4 w-4" />{busy ? "Analyzing..." : "View recommendation"}</button></div>{recommendation ? <div className="mt-5 rounded-xl border border-orange-200 bg-[#fffaf5] p-4"><div className="flex items-center gap-3"><Badge status={recommendation.recommendation} /><span className="text-sm font-semibold text-slate-600">Average achievement: {recommendation.average_achievement}%</span></div><p className="mt-3 text-sm leading-6 text-slate-600">{recommendation.reasoning}</p></div> : <div className="empty-state mt-5">Generate the backend recommendation to review scale-up readiness.</div>}</section>
      </div>
      <aside className="space-y-4"><div className="card p-5"><div className="section-label">Pilot Health</div><div className="mt-4 flex items-center gap-3"><div className={`flex h-12 w-12 items-center justify-center rounded-xl ${health === "At Risk" ? "bg-amber-100 text-amber-700" : health === "On Track" ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-600"}`}>{health === "At Risk" ? <ShieldAlert className="h-6 w-6" /> : <CheckCircle2 className="h-6 w-6" />}</div><div><div className="text-lg font-black text-[#0b2d4a]">{health}</div><div className="text-xs text-slate-500">Based on returned KPI statuses</div></div></div></div><div className="card p-5"><div className="section-label">Actions</div><button className="btn-secondary mt-4 w-full" onClick={() => updateStatus(pilot.status === "ACTIVE" ? "PLANNED" : "ACTIVE")} disabled={busy}><RefreshCw className="h-4 w-4" />Update Pilot Status</button><button className="btn-secondary mt-2 w-full" onClick={() => updateStatus("COMPLETED")} disabled={busy || pilot.status === "COMPLETED"}><CheckCircle2 className="h-4 w-4" />Complete Pilot</button><button className="btn-secondary mt-2 w-full" onClick={() => navigate(`/validation/${pilot.pilot_id}`)}><ExternalLink className="h-4 w-4" />View Validation</button><button className="btn-secondary mt-2 w-full" onClick={loadRecommendation} disabled={busy || !kpis.length}><TrendingUp className="h-4 w-4" />View Scale-up Recommendation</button></div></aside>
    </div>
  </div>;
}

function Field({ label, value }) { return <div><div className="text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</div><div className="mt-1 text-sm font-semibold text-slate-700">{value || "Not provided by API"}</div></div>; }
function endDate(startDate, duration) { const date = new Date(startDate); date.setMonth(date.getMonth() + (duration || 0)); return date.toLocaleDateString(); }
function DetailSkeleton() { return <div className="page-shell animate-pulse"><div className="h-8 w-48 rounded bg-slate-200" /><div className="grid gap-6 xl:grid-cols-[1fr_320px]"><div className="space-y-6"><div className="h-64 rounded-2xl bg-slate-200" /><div className="h-56 rounded-2xl bg-slate-200" /><div className="h-80 rounded-2xl bg-slate-200" /></div><div className="h-72 rounded-2xl bg-slate-200" /></div></div>; }
