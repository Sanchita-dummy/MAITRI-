import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Building2, MapPin, Plus, Search, Sparkles } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/client.js";
import Loading from "../components/Loading.jsx";
import Badge from "../components/Badge.jsx";

export default function Challenges() {
  const [challenges, setChallenges] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [applications, setApplications] = useState([]);
  const [query, setQuery] = useState("");
  const [department, setDepartment] = useState("ALL");
  const [status, setStatus] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([api.getChallenges(), api.getDepartments(), api.getApplications()])
      .then(([challengeList, departmentList, applicationList]) => {
        setChallenges(challengeList);
        setDepartments(departmentList);
        setApplications(applicationList);
      })
      .catch((requestError) => setError(requestError.response?.data?.detail || requestError.message))
      .finally(() => setLoading(false));
  }, []);

  const departmentName = (departmentId) =>
    departments.find((item) => item.department_id === departmentId)?.name || departmentId || "Government department";

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return challenges.filter((challenge) => {
      const matchesQuery = !normalizedQuery || [
        challenge.title,
        challenge.description,
        challenge.sector,
        ...(challenge.required_technologies || []),
      ].some((value) => value?.toLowerCase().includes(normalizedQuery));
      return matchesQuery &&
        (department === "ALL" || challenge.department_id === department) &&
        (status === "ALL" || challenge.status === status);
    });
  }, [challenges, department, query, status]);

  if (loading) return <ChallengeSkeleton />;
  if (error) return <div className="card border-red-200 bg-red-50 p-6 text-sm text-red-700">Unable to load challenges: {error}</div>;

  return (
    <div className="page-shell">
      <div className="page-intro">
        <div>
          <div className="section-label">Government Programs</div>
          <h1>Innovation Challenges</h1>
          <p>Discover, manage, and evaluate procurement challenges across government departments.</p>
        </div>
        <button className="btn-primary" onClick={() => navigate("/problems")}>
          <Plus className="h-4 w-4" /> Create Challenge
        </button>
      </div>

      <div className="card flex flex-col gap-3 p-3 lg:flex-row">
        <div className="relative min-w-0 flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input className="input-shell pl-9" placeholder="Search challenges..." value={query} onChange={(event) => setQuery(event.target.value)} />
        </div>
        <select className="filter-control" value={department} onChange={(event) => setDepartment(event.target.value)}>
          <option value="ALL">Department</option>
          {departments.map((item) => <option key={item.department_id} value={item.department_id}>{item.name}</option>)}
        </select>
        <select className="filter-control" value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="ALL">Status</option>
          <option value="PUBLISHED">Open</option>
          <option value="DRAFT">Draft</option>
        </select>
      </div>

      <div className="flex items-center justify-between">
        <div className="section-label">{filtered.length} opportunities</div>
        <div className="text-xs text-slate-400">Updated from live MAITRI data</div>
      </div>

      <div className="space-y-4">
        {filtered.map((challenge) => {
          const challengeApplications = applications.filter((item) => item.challenge_id === challenge.challenge_id);
          const eligible = challengeApplications.filter((item) => ["APPROVED", "ELIGIBLE"].includes(item.status)).length;
          const underEvaluation = challengeApplications.filter((item) => ["UNDER_REVIEW", "REVIEW"].includes(item.status)).length;
          const currentStage = challenge.status === "DRAFT"
            ? "Draft"
            : challengeApplications.some((item) => item.status === "APPROVED")
              ? "Pilot readiness"
              : underEvaluation > 0
                ? "Evaluation"
                : "Applications open";
          return (
            <Link key={challenge.challenge_id} to={`/challenges/${challenge.challenge_id}`} className="card group block p-5 transition hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-[0_12px_30px_rgba(15,23,42,0.08)]">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-xl font-black tracking-[-0.035em] text-[#0b2d4a] group-hover:text-[#e85d04]">{challenge.title}</h2>
                    <Badge status={challenge.status} />
                  </div>
                  <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-500">
                    <span className="inline-flex items-center gap-1.5"><Building2 className="h-4 w-4 text-slate-400" />{departmentName(challenge.department_id)}</span>
                    <span className="inline-flex items-center gap-1.5"><MapPin className="h-4 w-4 text-slate-400" />{challenge.location || "Location not provided"}</span>
                  </div>
                  <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-600">{challenge.description || "No challenge description provided."}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {(challenge.required_technologies || []).map((technology) => <span className="tag" key={technology}>{technology}</span>)}
                    {challenge.sector && <span className="tag bg-[#fff3eb] text-[#d95300]">{challenge.sector}</span>}
                  </div>
                </div>
                <div className="flex shrink-0 flex-col items-start gap-4 lg:items-end">
                  <div className="grid grid-cols-3 gap-5 text-left lg:text-right">
                    <Metric value={challengeApplications.length} label="applications" />
                    <Metric value={eligible} label="eligible" />
                    <Metric value={underEvaluation} label="under evaluation" />
                  </div>
                  <div className="text-xs text-slate-400 lg:text-right">Current stage: <span className="font-semibold text-slate-600">{currentStage}</span><br />Deadline: <span className="font-semibold text-slate-600">Not provided</span></div>
                  <span className="inline-flex items-center gap-2 text-sm font-bold text-[#e85d04]">View Challenge <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" /></span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
      {filtered.length === 0 && <div className="empty-state"><Sparkles className="mx-auto mb-2 h-5 w-5 text-orange-400" />No challenges match your filters.</div>}
    </div>
  );
}

function Metric({ value, label }) {
  return <div><div className="text-lg font-black text-[#0b2d4a]">{value}</div><div className="max-w-[86px] text-[11px] leading-4 text-slate-400">{label}</div></div>;
}

function ChallengeSkeleton() {
  return <div className="page-shell animate-pulse"><div className="h-24 rounded-2xl bg-slate-200" /><div className="h-16 rounded-2xl bg-slate-200" /><div className="space-y-4"><div className="h-48 rounded-2xl bg-slate-200" /><div className="h-48 rounded-2xl bg-slate-200" /></div></div>;
}