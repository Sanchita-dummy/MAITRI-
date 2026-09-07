import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { CheckCircle2, ShieldCheck, Sparkles, Edit3, Save, ExternalLink, AlertCircle } from "lucide-react";
import api from "../api/client.js";
import Loading from "../components/Loading.jsx";
import Badge from "../components/Badge.jsx";

export default function ChallengeDetail() {
  const { challengeId } = useParams();
  const [challenge, setChallenge] = useState(null);
  const [matches, setMatches] = useState(null);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [matching, setMatching] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState(null);
  const [eligibilityByStartup, setEligibilityByStartup] = useState({});
  const [evaluatingApp, setEvaluatingApp] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [problem, setProblem] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [generatedDraft, setGeneratedDraft] = useState(null);
  const [error, setError] = useState(null);

  const detailTabs = [
    ["overview", "Overview"],
    ["problem", "Problem"],
    ["objectives", "Objectives"],
    ["requirements", "Requirements"],
    ["eligibility", "Eligibility"],
    ["policies", "Related Policies"],
    ["startups", "Recommended Startups"],
    ["applications", "Applications"],
    ["evaluation", "Evaluation"],
    ["pilot", "Pilot"],
  ];

  const load = () => {
    setError(null);
    Promise.all([api.getChallenge(challengeId), api.getApplications(challengeId), api.getProblems(), api.getDepartments()]).then(([c, apps, problems, departmentList]) => {
      setChallenge(c);
      setEditForm({
        title: c.title,
        description: c.description,
        required_technologies: (c.required_technologies || []).join(", "),
        budget_range_inr: c.budget_range_inr,
        timeline_months: c.timeline_months,
      });
      setApplications(apps);
      setProblem(problems.find((item) => item.problem_id === c.problem_id) || null);
      setDepartments(departmentList);
      setLoading(false);
    }).catch((requestError) => {
      setError(requestError.response?.data?.detail || requestError.message);
      setLoading(false);
    });
  };

  useEffect(load, [challengeId]);

  const runMatching = async () => {
    setMatching(true);
    try {
      const result = await api.matchForChallenge(challengeId, 5);
      setMatches(result.results);
    } catch (e) {
      alert(e.response?.data?.detail || e.message);
    } finally {
      setMatching(false);
    }
  };

  const checkEligibility = async (startupId) => {
    const result = await api.checkEligibility(challengeId, startupId);
    setEligibilityByStartup((prev) => ({ ...prev, [startupId]: result }));
  };

  const saveEdits = async () => {
    const updated = await api.updateChallenge(challengeId, {
      ...editForm,
      required_technologies: editForm.required_technologies.split(",").map((s) => s.trim()).filter(Boolean),
      timeline_months: Number(editForm.timeline_months),
    });
    setChallenge(updated);
    setEditing(false);
  };

  const publish = async () => {
    const updated = await api.publishChallenge(challengeId);
    setChallenge(updated);
  };

  const generateWithAi = async () => {
    if (!challenge.problem_id) return;
    setAiGenerating(true);
    try {
      const draft = await api.generateChallenge(challenge.problem_id);
      setGeneratedDraft(draft);
    } catch (e) {
      setError(e.response?.data?.detail || e.message);
    } finally {
      setAiGenerating(false);
    }
  };

  const runEvaluation = async (applicationId) => {
    setEvaluatingApp(applicationId);
    try {
      await api.generateEvaluation(applicationId);
      load();
    } catch (e) {
      alert(
        "Could not generate an AI evaluation via Groq. Check that GROQ_API_KEY is set correctly in backend/.env.\n\n" +
          (e.response?.data?.detail || e.message)
      );
    } finally {
      setEvaluatingApp(null);
    }
  };

  if (loading) return <DetailSkeleton />;
  if (error && !challenge) return <div className="card border-red-200 bg-red-50 p-6 text-sm text-red-700"><AlertCircle className="mr-2 inline h-4 w-4" />Unable to load challenge: {error}</div>;
  if (!challenge) return null;

  const departmentName = departments.find((item) => item.department_id === challenge.department_id)?.name || challenge.department_id;

  return (
    <div className="page-shell">
      <div className="flex gap-1 overflow-x-auto border-b border-slate-200 pb-px">
        {detailTabs.map(([value, label]) => (
          <button
            key={value}
            onClick={() => setActiveTab(value)}
            className={`whitespace-nowrap border-b-2 px-3 py-3 text-sm font-semibold transition ${
              activeTab === value
                ? "border-[#ff6b0a] text-[#d95300]"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {["overview", "problem", "objectives", "requirements", "policies"].includes(activeTab) && (
      <div className="card p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            {editing ? (
              <input
                className="text-xl font-bold border border-slate-200 rounded-lg px-3 py-1.5 w-full"
                value={editForm.title}
                onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
              />
            ) : (
              <h1 className="text-3xl font-black tracking-[-0.045em] text-[#0b2d4a] md:text-4xl">{challenge.title}</h1>
            )}
            <div className="flex items-center gap-2 mt-2">
              <Badge status={challenge.status} />
              {challenge.ai_generated && (
                <span className="badge bg-purple-100 text-purple-700 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> AI Generated
                </span>
              )}
              <span className="text-xs text-slate-400">{challenge.sector}</span>
            </div>
          </div>
          <div className="flex flex-wrap justify-end gap-2 shrink-0">
            <button onClick={generateWithAi} disabled={aiGenerating || !challenge.problem_id} className="btn-secondary border-orange-200 text-[#d95300] hover:bg-[#fff3eb]">
              <Sparkles className="h-4 w-4" /> {aiGenerating ? "Generating..." : "Generate with AI"}
            </button>
            {!editing ? (
              <button
                onClick={() => setEditing(true)}
                className="btn-secondary"
              >
                <Edit3 className="w-4 h-4" /> Edit
              </button>
            ) : (
              <button
                onClick={saveEdits}
                className="btn-primary"
              >
                <Save className="w-4 h-4" /> Save
              </button>
            )}
            {challenge.status === "DRAFT" && (
              <button
                onClick={publish}
                className="btn-secondary border-green-200 text-green-700 hover:bg-green-50"
              >
                Publish
              </button>
            )}
          </div>
        </div>

        {editing ? (
          <textarea
            rows={4}
            className="mt-4 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
            value={editForm.description}
            onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
          />
        ) : (
          <p className="mt-4 text-slate-600">{challenge.description}</p>
        )}

        <div className="mt-6 grid gap-4 border-t border-slate-100 pt-5 sm:grid-cols-2 lg:grid-cols-3">
          <DetailField label="Department" value={departmentName} />
          <DetailField label="Problem statement" value={problem?.description} />
          <DetailField label="Location" value={challenge.location} />
          <DetailField label="Objectives" value={problem ? "Not provided by API" : null} />
          <DetailField label="Target users" value={null} />
          <DetailField label="Deadline" value={null} />
          <DetailField label="Budget" value={challenge.budget_range_inr} />
          <DetailField label="Pilot duration" value={challenge.timeline_months ? `${challenge.timeline_months} months` : null} />
          <DetailField label="Related policies" value={null} />
        </div>

        <div className="grid grid-cols-3 gap-4 mt-5 max-w-xl">
          <div>
            <div className="text-xs text-slate-400">Budget Range</div>
            {editing ? (
              <input
                className="mt-1 w-full border border-slate-200 rounded-lg px-2 py-1 text-sm"
                value={editForm.budget_range_inr}
                onChange={(e) => setEditForm({ ...editForm, budget_range_inr: e.target.value })}
              />
            ) : (
              <div className="font-medium text-slate-800">{challenge.budget_range_inr}</div>
            )}
          </div>
          <div>
            <div className="text-xs text-slate-400">Timeline (months)</div>
            {editing ? (
              <input
                type="number"
                className="mt-1 w-full border border-slate-200 rounded-lg px-2 py-1 text-sm"
                value={editForm.timeline_months}
                onChange={(e) => setEditForm({ ...editForm, timeline_months: e.target.value })}
              />
            ) : (
              <div className="font-medium text-slate-800">{challenge.timeline_months}</div>
            )}
          </div>
        </div>

        <div className="mt-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Required capabilities &amp; technologies</div>
          {editing ? (
            <input
              className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm"
              value={editForm.required_technologies}
              onChange={(e) => setEditForm({ ...editForm, required_technologies: e.target.value })}
            />
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {(challenge.required_technologies || []).map((t) => (
                <span key={t} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{t}</span>
              ))}
            </div>
          )}
        </div>
      </div>
      )}

      {generatedDraft && (
        <div className="card border-orange-200 bg-[#fffaf5] p-6">
          <div className="flex items-start gap-3"><Sparkles className="mt-0.5 h-5 w-5 text-[#ff6b0a]" /><div><div className="section-label">AI Review Panel</div><h2 className="mt-1 text-xl font-black text-[#0b2d4a]">Generated draft ready for review</h2><p className="mt-2 text-sm text-slate-600">The existing API has created a draft challenge. Review it before publishing.</p></div></div>
          <div className="mt-5 grid gap-4 md:grid-cols-2"><DetailField label="Title" value={generatedDraft.title} /><DetailField label="Budget" value={generatedDraft.budget_range_inr} /><DetailField label="Timeline" value={generatedDraft.timeline_months ? `${generatedDraft.timeline_months} months` : null} /><DetailField label="Technologies" value={(generatedDraft.required_technologies || []).join(", ")} /></div>
          <p className="mt-4 text-sm leading-6 text-slate-600">{generatedDraft.description}</p>
          <div className="mt-5 flex gap-2"><button className="btn-primary" onClick={() => window.location.assign(`/challenges/${generatedDraft.challenge_id}`)}>Review draft</button><button className="btn-secondary" onClick={() => setGeneratedDraft(null)}>Dismiss</button></div>
        </div>
      )}

      {["startups", "eligibility"].includes(activeTab) && <div className="card p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-slate-800">Startup Discovery & Semantic Matching</h2>
          <button
            onClick={runMatching}
            disabled={matching}
            className="flex items-center gap-1.5 text-sm font-medium bg-maitri-600 hover:bg-maitri-700 text-white px-3 py-1.5 rounded-lg disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4" /> {matching ? "Matching..." : "Run Matching"}
          </button>
        </div>

        {matches && (
          <div className="mt-4 space-y-3">
            {matches.map((m) => {
              const elig = eligibilityByStartup[m.startup.startup_id];
              return (
                <div key={m.startup.startup_id} className="rounded-xl border border-slate-100 bg-slate-50/50 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="font-medium text-slate-800">{m.startup.company_name}</div>
                      <div className="text-xs text-slate-400">{m.startup.headquarters} · TRL {m.startup.trl_level} · {m.startup.funding_stage}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-lg font-bold text-maitri-700">{m.match_score}%</div>
                      <div className="text-[11px] text-slate-400">match score</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 text-sm">
                    <div>
                      <div className="text-xs text-slate-400">Matching Capabilities</div>
                      <div className="text-slate-600">{m.matching_capabilities.join(", ")}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400">Matching Technologies</div>
                      <div className="text-slate-600">{m.matching_technologies.join(", ") || "None"}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400">Relevant Experience</div>
                      <div className="text-slate-600">{m.relevant_experience}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400">Missing Requirements</div>
                      <div className="text-slate-600">{m.missing_requirements.join(", ") || "None"}</div>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center gap-3">
                    <a href={`/startups#${m.startup.startup_id}`} className="btn-secondary px-2.5 py-1.5 text-xs"><ExternalLink className="h-3.5 w-3.5" /> View Startup</a>
                    <button
                      onClick={() => checkEligibility(m.startup.startup_id)}
                      className="flex items-center gap-1.5 text-xs font-medium text-maitri-700 border border-maitri-200 hover:bg-maitri-50 px-2.5 py-1 rounded-lg"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" /> Check Eligibility
                    </button>
                    {elig && <Badge status={elig.verdict} />}
                  </div>

                  {elig && (
                    <ul className="mt-2 text-xs text-slate-500 list-disc list-inside space-y-0.5">
                      {elig.explanations.map((ex, i) => (
                        <li key={i}>{ex}</li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>}

      {["applications", "evaluation"].includes(activeTab) && <div className="card p-6">
        <h2 className="font-semibold text-slate-800 mb-4">Applications</h2>
        {applications.length === 0 && <div className="empty-state">No applications yet for this challenge.</div>}
        <div className="space-y-2">
          {applications.map((a) => (
            <div key={a.application_id} className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div>
                <div className="text-sm font-medium text-slate-800">{a.startup_id}</div>
                <div className="text-xs text-slate-400">Match score: {a.match_score}</div>
              </div>
              <div className="flex items-center gap-2">
                <Badge status={a.status} />
                <button
                  onClick={() => runEvaluation(a.application_id)}
                  disabled={evaluatingApp === a.application_id}
                  className="flex items-center gap-1.5 text-xs font-medium border border-slate-200 hover:bg-slate-50 px-2.5 py-1 rounded-lg disabled:opacity-50"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {evaluatingApp === a.application_id ? "Evaluating..." : "AI Evaluate"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>}

      {activeTab === "pilot" && (
        <div className="empty-state">
          <div className="text-base font-bold text-[#0b2d4a]">Pilot stage</div>
          <div className="mt-1">A pilot will appear here after an application is approved.</div>
        </div>
      )}
    </div>
  );
}

function DetailField({ label, value }) {
  return <div><div className="text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</div><div className="mt-1 text-sm font-semibold text-slate-700">{value || "Not provided by API"}</div></div>;
}

function DetailSkeleton() {
  return <div className="page-shell animate-pulse"><div className="h-12 rounded-2xl bg-slate-200" /><div className="h-72 rounded-2xl bg-slate-200" /><div className="h-48 rounded-2xl bg-slate-200" /></div>;
}
