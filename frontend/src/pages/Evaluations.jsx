import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Search } from "lucide-react";
import { Link } from "react-router-dom";
import api from "../api/client.js";
import Badge from "../components/Badge.jsx";

export default function Evaluations() {
  const [evaluations, setEvaluations] = useState([]);
  const [applications, setApplications] = useState([]);
  const [startups, setStartups] = useState([]);
  const [challenges, setChallenges] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [eligibility, setEligibility] = useState({});
  const [filters, setFilters] = useState({ query: "", challenge: "ALL", department: "ALL", score: "ALL", recommendation: "ALL", status: "ALL" });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    Promise.all([api.getEvaluations(), api.getApplications(), api.getStartups(), api.getChallenges(), api.getDepartments()])
      .then(async ([evaluationList, applicationList, startupList, challengeList, departmentList]) => {
        setEvaluations(evaluationList); setApplications(applicationList); setStartups(startupList); setChallenges(challengeList); setDepartments(departmentList);
        const checks = await Promise.all(applicationList.map(async (application) => {
          try { return [application.application_id, await api.checkEligibility(application.challenge_id, application.startup_id)]; } catch { return [application.application_id, null]; }
        }));
        setEligibility(Object.fromEntries(checks));
      })
      .catch((requestError) => setError(requestError.response?.data?.detail || requestError.message))
      .finally(() => setLoading(false));
  }, []);

  const rows = useMemo(() => evaluations.map((evaluation) => {
    const application = applications.find((item) => item.application_id === evaluation.application_id);
    const challenge = challenges.find((item) => item.challenge_id === application?.challenge_id);
    return { evaluation, application, challenge, startup: startups.find((item) => item.startup_id === application?.startup_id), eligibility: eligibility[evaluation.application_id] };
  }).filter(({ evaluation, application, challenge, startup }) => {
    const search = [evaluation.evaluation_id, evaluation.application_id, startup?.company_name, challenge?.title].join(" ").toLowerCase();
    const scoreMatches = filters.score === "ALL" || (filters.score === "HIGH" ? evaluation.total_score >= 70 : filters.score === "MEDIUM" ? evaluation.total_score >= 55 && evaluation.total_score < 70 : evaluation.total_score < 55);
    return application && (!filters.query || search.includes(filters.query.toLowerCase())) && (filters.challenge === "ALL" || application.challenge_id === filters.challenge) && (filters.department === "ALL" || challenge?.department_id === filters.department) && scoreMatches && (filters.recommendation === "ALL" || evaluation.recommendation === filters.recommendation) && (filters.status === "ALL" || application.status === filters.status);
  }), [applications, challenges, departments, eligibility, evaluations, filters, startups]);

  if (loading) return <div className="page-shell animate-pulse"><div className="h-24 rounded-2xl bg-slate-200" /><div className="h-20 rounded-2xl bg-slate-200" /><div className="h-80 rounded-2xl bg-slate-200" /></div>;
  if (error) return <div className="card border-red-200 bg-red-50 p-6 text-sm text-red-700">Unable to load evaluations: {error}</div>;

  return <div className="page-shell"><div className="page-intro"><div><div className="section-label">Decision Support</div><h1>Evaluations</h1><p>Assess startup solutions using transparent, explainable procurement criteria.</p></div></div><div className="card grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-6"><div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input className="input-shell pl-9" placeholder="Search evaluations" value={filters.query} onChange={(event) => setFilters({ ...filters, query: event.target.value })} /></div><Select label="Challenge" value={filters.challenge} options={challenges.map((item) => [item.challenge_id, item.title])} onChange={(value) => setFilters({ ...filters, challenge: value })} /><Select label="Department" value={filters.department} options={departments.map((item) => [item.department_id, item.name])} onChange={(value) => setFilters({ ...filters, department: value })} /><Select label="Score" value={filters.score} options={[["HIGH", "70+"], ["MEDIUM", "55-69"], ["LOW", "Below 55"]]} onChange={(value) => setFilters({ ...filters, score: value })} /><Select label="Recommendation" value={filters.recommendation} options={[["APPROVE", "Recommended"], ["REVIEW", "Review"], ["REJECT", "Not recommended"]]} onChange={(value) => setFilters({ ...filters, recommendation: value })} /><Select label="Status" value={filters.status} options={unique(applications.map((item) => item.status)).map((value) => [value, value.replace(/_/g, " ")])} onChange={(value) => setFilters({ ...filters, status: value })} /></div><div className="flex items-center justify-between"><div className="section-label">{rows.length} evaluations</div><div className="text-xs text-slate-400">Scores and recommendations from live MAITRI data</div></div><div className="card overflow-x-auto"><table className="data-table w-full min-w-[980px] border-collapse"><thead><tr><th className="px-5 pt-4">Startup</th><th>Challenge</th><th>Application</th><th>Overall score</th><th>Eligibility</th><th>Stage</th><th>Recommendation</th><th>Date</th><th className="pr-5">Action</th></tr></thead><tbody>{rows.map(({ evaluation, application, challenge, startup, eligibility: result }) => <tr key={evaluation.evaluation_id}><td className="px-5 font-bold text-[#0b2d4a]">{startup?.company_name || application.startup_id}</td><td>{challenge?.title || application.challenge_id}</td><td>{application.application_id}</td><td className="font-black text-[#d95300]">{evaluation.total_score}/100</td><td>{result ? <Badge status={result.verdict} /> : <span className="text-xs text-slate-400">Not checked</span>}</td><td><Badge status={application.status === "APPROVED" ? "APPROVED" : "UNDER_REVIEW"}>{application.status === "APPROVED" ? "Pilot" : "Evaluation"}</Badge></td><td><Badge status={evaluation.recommendation} /></td><td>{new Date(evaluation.evaluated_at).toLocaleDateString()}</td><td className="pr-5"><Link className="inline-flex items-center gap-1 text-sm font-bold text-[#d95300]" to={`/applications/${application.application_id}`}>Review <ArrowRight className="h-3.5 w-3.5" /></Link></td></tr>)}</tbody></table></div>{!rows.length && <div className="empty-state">No evaluations match the selected filters.</div>}</div>;
}

function Select({ label, value, options, onChange }) { return <select className="filter-control" aria-label={label} value={value} onChange={(event) => onChange(event.target.value)}><option value="ALL">{label}</option>{options.map(([optionValue, optionLabel]) => <option key={optionValue} value={optionValue}>{optionLabel}</option>)}</select>; }
function unique(values) { return [...new Set(values)]; }
