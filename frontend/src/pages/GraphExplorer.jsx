import { useEffect, useState } from "react";
import { Share2, RefreshCw, AlertTriangle } from "lucide-react";
import api from "../api/client.js";
import Loading from "../components/Loading.jsx";
import Badge from "../components/Badge.jsx";

export default function GraphExplorer() {
  const [connected, setConnected] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [departmentId, setDepartmentId] = useState("");
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.getGraphStatus().then((s) => setConnected(s.connected));
    api.getDepartments().then((d) => {
      setDepartments(d);
      if (d.length) setDepartmentId(d[0].department_id);
    });
  }, []);

  const runQuery = async (deptId) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getDepartmentGraph(deptId);
      setResults(res);
    } catch (e) {
      setError(e.response?.data?.detail || "Graph query failed.");
    } finally {
      setLoading(false);
    }
  };

  const sync = async () => {
    setSyncing(true);
    setError(null);
    try {
      await api.syncGraph();
      const s = await api.getGraphStatus();
      setConnected(s.connected);
    } catch (e) {
      setError("Sync failed. Is Neo4j running (docker compose up -d)?");
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="page-shell">
      <div className="page-intro">
        <div>
          <div className="section-label">Systems View</div>
          <h1 className="flex items-center gap-2 text-3xl font-black tracking-[-0.045em] text-[#0b2d4a] md:text-4xl">
            <Share2 className="w-6 h-6 text-maitri-600" />
            Relationship Graph
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
            Explore Department → Problem → Challenge → Startup → Pilot → KPI relationships stored in Neo4j.
          </p>
        </div>
        <button
          onClick={sync}
          disabled={syncing}
          className="btn-primary"
        >
          <RefreshCw className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} />
          Sync from database
        </button>
      </div>

      {connected === false && (
        <div className="card p-4 bg-amber-50 border-amber-200 text-amber-800 text-sm flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <div>
            Neo4j is not reachable right now. Start it with <code className="bg-white px-1 rounded">docker compose up -d</code> from
            the project root, then click "Sync from database". The rest of MAITRI works normally without it -
            Neo4j is a value-add relationship layer, not the source of truth.
          </div>
        </div>
      )}

      <div className="card flex items-center gap-3 p-4">
        <label className="text-sm text-slate-600">Department:</label>
        <select
          className="filter-control"
          value={departmentId}
          onChange={(e) => setDepartmentId(e.target.value)}
        >
          {departments.map((d) => (
            <option key={d.department_id} value={d.department_id}>{d.name}</option>
          ))}
        </select>
        <button
          onClick={() => runQuery(departmentId)}
          className="btn-secondary bg-[#0b2d4a] text-white hover:bg-[#123c5c]"
        >
          Show startups & pilots
        </button>
      </div>

      {loading && <Loading label="Querying Neo4j..." />}
      {error && <div className="card p-4 text-red-600 text-sm">{error}</div>}

      {results && (
        <div className="card p-5">
          <h2 className="font-semibold text-slate-800 mb-1">{results.query_description}</h2>
          <p className="text-xs text-slate-400 mb-4">
            Cypher: Department -[:OWNS]-&gt; Problem -[:BECOMES]-&gt; Challenge -[:MATCHED_WITH]-&gt; Startup
            -[:SUBMITTED]-&gt; Application -[:BECAME]-&gt; Pilot -[:MEASURED_BY]-&gt; KPI
          </p>
          {results.results.length === 0 ? (
            <div className="text-sm text-slate-400 py-6 text-center">
              No relationships found yet. Run the seed scripts, then click "Sync from database".
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-400 border-b border-slate-100">
                    <th className="py-2 pr-4">Challenge</th>
                    <th className="py-2 pr-4">Startup</th>
                    <th className="py-2 pr-4">Pilot</th>
                    <th className="py-2 pr-4">KPIs</th>
                  </tr>
                </thead>
                <tbody>
                  {results.results.map((row, i) => (
                    <tr key={i} className="border-b border-slate-50">
                      <td className="py-2 pr-4">{row.challenge}</td>
                      <td className="py-2 pr-4">{row.startup}</td>
                      <td className="py-2 pr-4">
                        {row.pilot_id ? (
                          <Badge status={row.pilot_status}>{row.pilot_id}</Badge>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                      <td className="py-2 pr-4">
                        {(row.kpis || []).filter((k) => k.metric).map((k) => (
                          <span key={k.metric} className="badge bg-slate-100 text-slate-600 mr-1 mb-1">
                            {k.metric}: {k.achievement}%
                          </span>
                        ))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
