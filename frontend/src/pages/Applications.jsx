import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Search } from "lucide-react";
import { Link } from "react-router-dom";
import api from "../api/client.js";
import Loading from "../components/Loading.jsx";
import Badge from "../components/Badge.jsx";

export default function Applications() {
  const [applications, setApplications] = useState([]);
  const [startups, setStartups] = useState([]);
  const [challenges, setChallenges] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [eligibility, setEligibility] = useState({});
  const [filters, setFilters] = useState({ query: "", challenge: "ALL", department: "ALL", status: "ALL", sort: "date" });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    Promise.all([api.getApplications(), api.getStartups(), api.getChallenges(), api.getDepartments()])
      .then(async ([applicationList, startupList, challengeList, departmentList]) => {
        setApplications(applicationList);
        setStartups(startupList);
        setChallenges(challengeList);
        setDepartments(departmentList);
        const checks = await Promise.all(applicationList.map(async (application) => {
          try { return [application.application_id, await api.checkEligibility(application.challenge_id, application.startup_id)]; }
          catch { return [application.application_id, null]; }
        }));
        setEligibility(Object.fromEntries(checks));
      })
      .catch((requestError) => setError(requestError.response?.data?.detail || requestError.message))
      .finally(() => setLoading(false));
  }, []);

  const rows = useMemo(() => applications.map((application) => ({
    application,
    startup: startups.find((item) => item.startup_id === application.startup_id),
    challenge: challenges.find((item) => item.challenge_id === application.challenge_id),
    eligibility: eligibility[application.application_id],
  })).filter(({ application, startup, challenge }) => {
    const search = [application.application_id, application.startup_id, application.challenge_id, startup?.company_name, challenge?.title].join(" ").toLowerCase();
    return (!filters.query || search.includes(filters.query.toLowerCase())) &&
      (filters.challenge === "ALL" || application.challenge_id === filters.challenge) &&
      (filters.department === "ALL" || challenge?.department_id === filters.department) &&
      (filters.status === "ALL" || application.status === filters.status);
  }).sort((a, b) => filters.sort === "score" ? b.application.match_score - a.application.match_score : new Date(b.application.submitted_at) - new Date(a.application.submitted_at)), [applications, challenges, departments, eligibility, filters, startups]);

  if (loading) return <div className="page-shell animate-pulse"><div className="h-24 rounded-2xl bg-slate-200" /><div className="h-20 rounded-2xl bg-slate-200" /><div className="h-80 rounded-2xl bg-slate-200" /></div>;
  if (error) return <div className="card border-red-200 bg-red-50 p-6 text-sm text-red-700">Unable to load applications: {error}</div>;

  return <div className="page-shell">
    <div className="page-intro"><div><div className="section-label">Review Workspace</div><h1>Applications</h1><p>Review startup submissions and move promising solutions through the procurement workflow.</p></div></div>
    <div className="card grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-5">
      <div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input className="input-shell pl-9" placeholder="Search applications" value={filters.query} onChange={(event) => setFilters({ ...filters, query: event.target.value })} /></div>
      <Select label="Challenge" value={filters.challenge} options={challenges.map((item) => [item.challenge_id, item.title])} onChange={(value) => setFilters({ ...filters, challenge: value })} />
      <Select label="Department" value={filters.department} options={departments.map((item) => [item.department_id, item.name])} onChange={(value) => setFilters({ ...filters, department: value })} />
      <Select label="Status" value={filters.status} options={unique(applications.map((item) => item.status)).map((value) => [value, value.replace(/_/g, " ")])} onChange={(value) => setFilters({ ...filters, status: value })} />
      <select className="filter-control" value={filters.sort} onChange={(event) => setFilters({ ...filters, sort: event.target.value })}><option value="date">Sort by date</option><option value="score">Sort by score</option></select>
    </div>
    <div className="flex items-center justify-between"><div className="section-label">{rows.length} applications</div><div className="text-xs text-slate-400">Updated from live MAITRI data</div></div>
    <div className="card overflow-x-auto"><table className="data-table w-full min-w-[980px] border-collapse"><thead><tr><th className="px-5 pt-4">Startup</th><th>Challenge</th><th>Department</th><th>Submitted</th><th>Eligibility</th><th>Match score</th><th>Status</th><th className="pr-5">Action</th></tr></thead><tbody>{rows.map(({ application, startup, challenge, eligibility: result }) => <tr key={application.application_id}><td className="px-5"><div className="font-bold text-[#0b2d4a]">{startup?.company_name || application.startup_id}</div><div className="text-xs text-slate-400">{application.application_id}</div></td><td>{challenge?.title || application.challenge_id}</td><td>{departments.find((item) => item.department_id === challenge?.department_id)?.name || "Not provided"}</td><td>{new Date(application.submitted_at).toLocaleDateString()}</td><td>{result ? <Badge status={result.verdict} /> : <span className="text-xs text-slate-400">Not checked</span>}</td><td className="font-bold text-[#d95300]">{application.match_score}%</td><td><Badge status={application.status} /></td><td className="pr-5"><Link className="inline-flex items-center gap-1 text-sm font-bold text-[#d95300]" to={`/applications/${application.application_id}`}>Review <ArrowRight className="h-3.5 w-3.5" /></Link></td></tr>)}</tbody></table></div>
    {!rows.length && <div className="empty-state">No applications match the selected filters.</div>}
  </div>;
}

function Select({ label, value, options, onChange }) { return <select className="filter-control" aria-label={label} value={value} onChange={(event) => onChange(event.target.value)}><option value="ALL">{label}</option>{options.map(([optionValue, optionLabel]) => <option key={optionValue} value={optionValue}>{optionLabel}</option>)}</select>; }
function unique(values) { return [...new Set(values)]; }
