import { useEffect, useState } from "react";
import { Plus, Sparkles, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../api/client.js";
import Loading from "../components/Loading.jsx";
import Badge from "../components/Badge.jsx";

export default function Problems() {
  const [problems, setProblems] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [generatingId, setGeneratingId] = useState(null);
  const [generatedDraft, setGeneratedDraft] = useState(null);
  const navigate = useNavigate();

  const load = () => {
    Promise.all([api.getProblems(), api.getDepartments()]).then(([p, d]) => {
      setProblems(p);
      setDepartments(d);
      setLoading(false);
    });
  };

  useEffect(load, []);

  const deptName = (id) => departments.find((d) => d.department_id === id)?.name || id;

  const handleGenerate = async (problemId) => {
    setGeneratingId(problemId);
    try {
      const challenge = await api.generateChallenge(problemId);
      setGeneratedDraft(challenge);
    } catch (e) {
      alert(
        "Could not generate a challenge via Groq. Check that GROQ_API_KEY is set correctly in backend/.env.\n\n" +
          (e.response?.data?.detail || e.message)
      );
    } finally {
      setGeneratingId(null);
    }
  };

  if (loading) return <Loading label="Loading problems..." />;

  return (
    <div className="page-shell">
      <div className="page-intro">
        <div>
          <div className="section-label">Department Intake</div>
          <h1 className="text-3xl font-black tracking-[-0.045em] text-[#0b2d4a] md:text-4xl">Government Problems</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
            Problems submitted by departments. Generate an AI innovation challenge from any of them.
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="btn-primary"
        >
          <Plus className="w-4 h-4" /> New Problem
        </button>
      </div>

      {showForm && (
        <NewProblemForm
          departments={departments}
          onClose={() => setShowForm(false)}
          onCreated={() => {
            setShowForm(false);
            load();
          }}
        />
      )}

      {generatedDraft && (
        <div className="card border-orange-200 bg-[#fffaf5] p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="section-label">AI Review Panel</div>
              <h2 className="mt-1 text-xl font-black text-[#0b2d4a]">Generated challenge draft</h2>
              <p className="mt-2 text-sm text-slate-600">Review the AI result before opening the draft for editing and publication.</p>
            </div>
            <Badge status={generatedDraft.status} />
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div><div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Title</div><div className="mt-1 font-semibold text-slate-800">{generatedDraft.title}</div></div>
            <div><div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Budget</div><div className="mt-1 font-semibold text-slate-800">{generatedDraft.budget_range_inr || "Not provided"}</div></div>
            <div><div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Pilot duration</div><div className="mt-1 font-semibold text-slate-800">{generatedDraft.timeline_months ? `${generatedDraft.timeline_months} months` : "Not provided"}</div></div>
            <div><div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Technologies</div><div className="mt-1 font-semibold text-slate-800">{(generatedDraft.required_technologies || []).join(", ") || "Not provided"}</div></div>
          </div>
          <p className="mt-4 text-sm leading-6 text-slate-600">{generatedDraft.description || "No description returned."}</p>
          <div className="mt-5 flex gap-2"><button className="btn-primary" onClick={() => navigate(`/challenges/${generatedDraft.challenge_id}`)}>Review and edit draft</button><button className="btn-secondary" onClick={() => setGeneratedDraft(null)}>Dismiss</button></div>
        </div>
      )}

      <div className="card divide-y divide-slate-100">
        {problems.map((p) => (
          <div key={p.problem_id} className="flex items-start justify-between gap-4 p-5 transition hover:bg-slate-50/70">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-slate-800">{p.title}</span>
                <Badge status={p.priority} />
                <Badge status={p.status} />
              </div>
              <div className="text-xs text-slate-400 mt-0.5">
                {deptName(p.department_id)} · {p.sector}
              </div>
              <p className="text-sm text-slate-600 mt-2 max-w-2xl">{p.description}</p>
            </div>
            <button
              onClick={() => handleGenerate(p.problem_id)}
              disabled={generatingId === p.problem_id}
              className="btn-secondary shrink-0 border-orange-200 text-[#d95300] hover:bg-[#fff3eb]"
            >
              <Sparkles className="w-4 h-4" />
              {generatingId === p.problem_id ? "Generating..." : "Generate Challenge"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function NewProblemForm({ departments, onClose, onCreated }) {
  const [form, setForm] = useState({ department_id: departments[0]?.department_id || "", title: "", description: "", priority: "MEDIUM" });
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.createProblem(form);
      onCreated();
    } catch (e) {
      alert(e.response?.data?.detail || e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="card p-5 relative">
      <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
        <X className="w-4 h-4" />
      </button>
      <h2 className="font-semibold text-slate-800 mb-4">Submit a New Problem</h2>
      <form onSubmit={submit} className="space-y-3 max-w-xl">
        <div>
          <label className="text-xs font-medium text-slate-500">Department</label>
          <select
            className="input-shell mt-1"
            value={form.department_id}
            onChange={(e) => setForm({ ...form, department_id: e.target.value })}
          >
            {departments.map((d) => (
              <option key={d.department_id} value={d.department_id}>{d.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-slate-500">Title</label>
          <input
            required
            className="input-shell mt-1"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-500">Description</label>
          <textarea
            required
            rows={3}
            className="input-shell mt-1"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-500">Priority</label>
          <select
            className="input-shell mt-1"
            value={form.priority}
            onChange={(e) => setForm({ ...form, priority: e.target.value })}
          >
            <option>HIGH</option>
            <option>MEDIUM</option>
            <option>LOW</option>
          </select>
        </div>
        <button
          disabled={submitting}
          className="btn-primary"
        >
          {submitting ? "Submitting..." : "Submit Problem"}
        </button>
      </form>
    </div>
  );
}
