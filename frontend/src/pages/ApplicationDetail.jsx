import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, CheckCircle2, FileCheck2, PlayCircle, ShieldCheck } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import api from "../api/client.js";
import Loading from "../components/Loading.jsx";
import Badge from "../components/Badge.jsx";

const stages = ["Submitted", "Eligibility", "Evaluation", "Pilot", "Validation", "Procurement", "Scale-up"];
const scoreLabels = [
  ["technical_feasibility", "Technical feasibility"],
  ["expected_impact", "Expected impact"],
  ["pilot_readiness", "Pilot readiness"],
  ["scalability", "Scalability"],
  ["security", "Security"],
  ["cost_efficiency", "Cost efficiency"],
];

export default function ApplicationDetail() {
  const { applicationId } = useParams();
  const [application, setApplication] = useState(null);
  const [startup, setStartup] = useState(null);
  const [challenge, setChallenge] = useState(null);
  const [department, setDepartment] = useState(null);
  const [evaluation, setEvaluation] = useState(null);
  const [eligibility, setEligibility] = useState(null);
  const [loading, setLoading] = useState(true);
  const [evaluating, setEvaluating] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState(null);

  const load = () => {
    setError(null);
    Promise.all([api.getApplication(applicationId), api.getEvaluations(), api.getStartups(), api.getChallenges(), api.getDepartments()])
      .then(([app, evaluations, startups, challenges, departments]) => {
        setApplication(app);
        setEvaluation(evaluations.find((item) => item.application_id === app.application_id) || null);
        setStartup(startups.find((item) => item.startup_id === app.startup_id) || null);
        setChallenge(challenges.find((item) => item.challenge_id === app.challenge_id) || null);
        setDepartment(departments.find((item) => item.department_id === challenges.find((item) => item.challenge_id === app.challenge_id)?.department_id) || null);
      })
      .catch((requestError) => setError(requestError.response?.data?.detail || requestError.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, [applicationId]);

  const currentStage = useMemo(() => {
    if (application?.status === "APPROVED") return "Pilot";
    if (evaluation) return "Evaluation";
    return "Submitted";
  }, [application, evaluation]);

  const runEligibility = async () => {
    setChecking(true);
    try { setEligibility(await api.checkEligibility(application.challenge_id, application.startup_id)); } catch (requestError) { setError(requestError.response?.data?.detail || requestError.message); } finally { setChecking(false); }
  };

  const generateEvaluation = async () => {
    setEvaluating(true);
    try { setEvaluation(await api.generateEvaluation(application.application_id)); } catch (requestError) { setError(requestError.response?.data?.detail || requestError.message); } finally { setEvaluating(false); }
  };

  if (loading) return <DetailSkeleton />;
  if (error && !application) return <div className="card border-red-200 bg-red-50 p-6 text-sm text-red-700">Unable to load application: {error}</div>;
  if (!application) return null;

  return <div className="page-shell">
    <Link to="/applications" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-[#d95300]"><ArrowLeft className="h-4 w-4" /> Back to Applications</Link>
    {error && <div className="card border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-6">
        <div className="card p-6"><div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><div className="section-label">Officer Review Workspace</div><h1 className="mt-2 text-3xl font-black tracking-[-0.045em] text-[#0b2d4a] md:text-4xl">{startup?.company_name || application.startup_id}</h1><p className="mt-2 text-sm text-slate-500">Application {application.application_id} for {challenge?.title || application.challenge_id}</p></div><Badge status={application.status} /></div><div className="mt-6 grid gap-4 border-t border-slate-100 pt-5 sm:grid-cols-2"><Info label="Department" value={department?.name || challenge?.department_id} /><Info label="Submitted" value={new Date(application.submitted_at).toLocaleDateString()} /><Info label="Match score" value={`${application.match_score}%`} /><Info label="Eligibility" value={eligibility?.verdict || "Not checked"} /></div></div>
        <Section title="Startup"><div className="grid gap-4 sm:grid-cols-2"><Info label="Name" value={startup?.company_name} /><Info label="TRL" value={startup?.trl_level} /><Info label="Sector" value={startup?.sectors?.join(", ")} /><Info label="Government experience" value={startup?.government_experience ? "Yes" : "No"} /></div><p className="mt-4 text-sm leading-6 text-slate-600">{startup?.description || "Startup description not provided by API."}</p><div className="mt-4 flex flex-wrap gap-2">{(startup?.technologies || []).map((item) => <span className="tag" key={item}>{item}</span>)}</div></Section>
        <Section title="Proposed Solution"><div className="empty-state">Solution description, implementation plan, estimated cost, and duration are not included in the current Application API response.</div></Section>
        <Section title="Eligibility"><button className="btn-primary" onClick={runEligibility} disabled={checking}><ShieldCheck className="h-4 w-4" />{checking ? "Checking..." : "Run Eligibility Check"}</button>{eligibility && <div className="mt-5 rounded-xl border border-green-200 bg-green-50 p-4"><Badge status={eligibility.verdict} /><ul className="mt-3 space-y-2 text-sm text-green-900">{eligibility.explanations.map((item, index) => <li key={index}>✓ {item}</li>)}</ul>{eligibility.rule_results?.length > 0 && <div className="mt-4 space-y-2 border-t border-green-200 pt-3">{eligibility.rule_results.map((rule, index) => <div className="text-sm text-green-900" key={index}>{rule.label || rule.rule_type || "Eligibility check"}: {String(rule.result ?? rule.passed ?? "Evaluated")}</div>)}</div>}</div>}</Section>
        <Section title="AI Evaluation"><div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-slate-500">Scores are generated and persisted by the existing evaluation endpoint.</p><button className="btn-primary" onClick={generateEvaluation} disabled={evaluating}><PlayCircle className="h-4 w-4" />{evaluating ? "Evaluating..." : evaluation ? "Regenerate Evaluation" : "Generate Evaluation"}</button></div>{evaluation ? <div className="mt-5 grid gap-4 sm:grid-cols-2">{scoreLabels.map(([key, label]) => <Score key={key} label={label} value={evaluation.scores?.[key] ?? 0} />)}<div className="rounded-xl bg-[#fff3eb] p-4 sm:col-span-2"><div className="text-xs font-semibold uppercase tracking-wider text-[#d95300]">Overall score</div><div className="mt-1 text-3xl font-black text-[#0b2d4a]">{evaluation.total_score}</div><Badge status={evaluation.recommendation} /></div><p className="text-sm leading-6 text-slate-600 sm:col-span-2">{evaluation.reasoning || "No AI reasoning returned."}</p></div> : <div className="empty-state mt-5">No AI evaluation has been generated for this application.</div>}</Section>
      </div>
      <aside className="space-y-4"><div className="card p-5"><div className="section-label">Application Summary</div><Summary label="Status" value={<Badge status={application.status} />} /><Summary label="Eligibility" value={eligibility ? <Badge status={eligibility.verdict} /> : "Not checked"} /><Summary label="AI Score" value={evaluation?.total_score ?? "Not evaluated"} /><Summary label="Recommended Decision" value={evaluation ? <Badge status={evaluation.recommendation} /> : "Not evaluated"} /></div><div className="card p-5"><div className="section-label">Lifecycle</div><div className="mt-4 space-y-3">{stages.map((stage) => <div className={`flex items-center gap-3 text-sm ${stage === currentStage ? "font-bold text-[#d95300]" : "text-slate-500"}`} key={stage}><span className={`h-2.5 w-2.5 rounded-full ${stage === currentStage ? "bg-[#ff6b0a]" : stages.indexOf(stage) < stages.indexOf(currentStage) ? "bg-green-500" : "bg-slate-200"}`} />{stage}</div>)}</div></div><div className="card p-5"><div className="section-label">Decision</div><p className="mt-3 text-sm leading-6 text-slate-500">Approve, request-information, and reject mutation endpoints are not present in the current FastAPI contract.</p><button className="btn-secondary mt-4 w-full" disabled><FileCheck2 className="h-4 w-4" />Decision actions unavailable</button></div></aside>
    </div>
  </div>;
}

function Section({ title, children }) { return <section className="card p-6"><h2 className="text-xl font-black text-[#0b2d4a]">{title}</h2><div className="mt-4">{children}</div></section>; }
function Info({ label, value }) { return <div><div className="text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</div><div className="mt-1 text-sm font-semibold text-slate-700">{value || "Not provided by API"}</div></div>; }
function Summary({ label, value }) { return <div className="flex items-center justify-between gap-3 border-b border-slate-100 py-3 text-sm"><span className="text-slate-500">{label}</span><span className="text-right font-bold text-[#0b2d4a]">{value}</span></div>; }
function Score({ label, value }) { return <div><div className="flex justify-between text-sm font-semibold text-slate-700"><span>{label}</span><span>{value}/100</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-[#ff6b0a]" style={{ width: `${value}%` }} /></div></div>; }
function DetailSkeleton() { return <div className="page-shell animate-pulse"><div className="h-8 w-48 rounded bg-slate-200" /><div className="grid gap-6 xl:grid-cols-[1fr_320px]"><div className="space-y-6"><div className="h-64 rounded-2xl bg-slate-200" /><div className="h-48 rounded-2xl bg-slate-200" /></div><div className="h-72 rounded-2xl bg-slate-200" /></div></div>; }
