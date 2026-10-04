import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ShieldAlert, FileWarning, LifeBuoy, BarChart3 } from "lucide-react";
import GlassCard from "../components/GlassCard";
import Badge from "../components/Badge";
import EmptyState from "../components/EmptyState";
import { SkeletonCard } from "../components/Skeleton";
import {
  listIncidents, updateIncidentStatus, listRescueTeams, listRescueOperations,
  createRescueOperation, updateRescueOperation, getAnalytics,
} from "../services/api";
import { INCIDENT_STATUSES, formatLabel, timeAgo } from "../utils/severity";
import { useToast } from "../context/ToastContext";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, Legend,
} from "recharts";

const TABS = [
  { key: "incidents", label: "Incidents", icon: FileWarning },
  { key: "rescue", label: "Rescue Coordination", icon: LifeBuoy },
  { key: "analytics", label: "Analytics", icon: BarChart3 },
];

const RESCUE_STATUSES = ["PENDING", "DISPATCHED", "EN_ROUTE", "ON_SCENE", "RESOLVED"];
const PIE_COLORS = ["#22C55E", "#EAB308", "#F97316", "#EF4444"];

export default function AdminPage() {
  const [tab, setTab] = useState("incidents");

  return (
    <div className="space-y-6 pb-10">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink-100 flex items-center gap-2">
          <ShieldAlert size={22} className="text-cyan-accent" /> Admin Command Center
        </h1>
        <p className="text-sm text-ink-500 mt-1">Manage incidents, coordinate rescue operations, and monitor platform analytics.</p>
      </div>

      <div className="inline-flex rounded-xl bg-white/5 border border-white/10 p-1 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              tab === t.key ? "bg-cyan-accent text-base-950" : "text-ink-300 hover:text-ink-100"
            }`}
          >
            <t.icon size={15} /> {t.label}
          </button>
        ))}
      </div>

      {tab === "incidents" && <IncidentsTab />}
      {tab === "rescue" && <RescueTab />}
      {tab === "analytics" && <AnalyticsTab />}
    </div>
  );
}

function IncidentsTab() {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const { push } = useToast();

  const load = () => {
    setLoading(true);
    listIncidents({ limit: 100 }).then(setIncidents).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const handleStatusChange = async (id, status) => {
    try {
      await updateIncidentStatus(id, status);
      setIncidents((prev) => prev.map((i) => (i.id === id ? { ...i, status } : i)));
      push("Incident status updated.", "success");
    } catch {
      push("Could not update status.", "error");
    }
  };

  if (loading) return <div className="grid sm:grid-cols-2 gap-4">{Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}</div>;
  if (incidents.length === 0) return <EmptyState icon={FileWarning} title="No incidents yet" />;

  return (
    <GlassCard className="overflow-x-auto p-0">
      <table className="w-full text-sm min-w-[720px]">
        <thead>
          <tr className="text-left text-xs text-ink-500 border-b border-white/5">
            <th className="p-4 font-medium">Code</th>
            <th className="p-4 font-medium">Type</th>
            <th className="p-4 font-medium">Severity</th>
            <th className="p-4 font-medium">Location</th>
            <th className="p-4 font-medium">Reported</th>
            <th className="p-4 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {incidents.map((inc) => (
            <tr key={inc.id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02]">
              <td className="p-4 font-mono text-cyan-accent text-xs">{inc.incident_code}</td>
              <td className="p-4 text-ink-100">{formatLabel(inc.incident_type)}</td>
              <td className="p-4"><Badge level={inc.severity} /></td>
              <td className="p-4 text-ink-500 text-xs">{inc.location_label || "—"}</td>
              <td className="p-4 text-ink-500 text-xs">{timeAgo(inc.created_at)}</td>
              <td className="p-4">
                <select
                  value={inc.status}
                  onChange={(e) => handleStatusChange(inc.id, e.target.value)}
                  className="text-xs bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-ink-100 outline-none"
                >
                  {INCIDENT_STATUSES.map((s) => <option key={s} value={s}>{formatLabel(s)}</option>)}
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </GlassCard>
  );
}

function RescueTab() {
  const [operations, setOperations] = useState([]);
  const [teams, setTeams] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const { push } = useToast();

  const load = () => {
    setLoading(true);
    Promise.all([listRescueOperations(), listRescueTeams(), listIncidents({ limit: 100 })])
      .then(([ops, tms, incs]) => { setOperations(ops); setTeams(tms); setIncidents(incs); })
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const unassignedIncidents = incidents.filter((i) => !operations.some((o) => o.incident_id === i.id));

  const handleAssign = async (incidentId, teamId) => {
    try {
      await createRescueOperation({ incident_id: incidentId, team_id: teamId || null, priority: "HIGH", estimated_response_minutes: 20 });
      push("Rescue operation created.", "success");
      load();
    } catch {
      push("Could not create rescue operation.", "error");
    }
  };

  const handleStatusChange = async (id, status) => {
    try {
      await updateRescueOperation(id, { status });
      setOperations((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)));
      push("Operation updated.", "success");
    } catch {
      push("Could not update operation.", "error");
    }
  };

  if (loading) return <div className="grid sm:grid-cols-2 gap-4">{Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}</div>;

  return (
    <div className="space-y-6">
      {unassignedIncidents.length > 0 && (
        <GlassCard>
          <h3 className="font-display font-medium text-ink-100 mb-3">Unassigned incidents</h3>
          <div className="space-y-2.5">
            {unassignedIncidents.map((inc) => (
              <div key={inc.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white/5 border border-white/5 p-3">
                <div>
                  <p className="text-sm text-ink-100">{inc.incident_code} · {formatLabel(inc.incident_type)}</p>
                  <p className="text-xs text-ink-500">{inc.location_label || "Unlabeled"}</p>
                </div>
                <select
                  onChange={(e) => e.target.value && handleAssign(inc.id, e.target.value)}
                  defaultValue=""
                  className="text-xs bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-ink-100 outline-none"
                >
                  <option value="" disabled>Assign team…</option>
                  {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      <GlassCard>
        <h3 className="font-display font-medium text-ink-100 mb-3">Active operations</h3>
        {operations.length === 0 ? (
          <EmptyState icon={LifeBuoy} title="No rescue operations yet" />
        ) : (
          <div className="space-y-2.5">
            {operations.map((op) => {
              const incident = incidents.find((i) => i.id === op.incident_id);
              const team = teams.find((t) => t.id === op.team_id);
              return (
                <div key={op.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white/5 border border-white/5 p-3.5">
                  <div className="min-w-[180px]">
                    <p className="text-sm text-ink-100">{incident?.incident_code || "—"}</p>
                    <p className="text-xs text-ink-500">{team?.name || "Unassigned team"}</p>
                  </div>
                  <Badge level={op.priority} />
                  <span className="text-xs text-ink-500">ETA {op.estimated_response_minutes ?? "—"} min</span>
                  <select
                    value={op.status}
                    onChange={(e) => handleStatusChange(op.id, e.target.value)}
                    className="text-xs bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-ink-100 outline-none"
                  >
                    {RESCUE_STATUSES.map((s) => <option key={s} value={s}>{formatLabel(s)}</option>)}
                  </select>
                </div>
              );
            })}
          </div>
        )}
      </GlassCard>
    </div>
  );
}

function AnalyticsTab() {
  const [data, setData] = useState(null);

  useEffect(() => { getAnalytics().then(setData).catch(() => {}); }, []);

  if (!data) return <div className="grid sm:grid-cols-2 gap-4">{Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}</div>;

  const typeData = Object.entries(data.incidents_by_type).map(([name, value]) => ({ name: formatLabel(name), value }));
  const riskData = Object.entries(data.risk_distribution).map(([name, value]) => ({ name, value }));

  return (
    <div className="space-y-6">
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatBox label="Total incidents" value={data.total_incidents} />
        <StatBox label="Active emergencies" value={data.active_emergencies} accent="text-severity-critical" />
        <StatBox label="Resolved" value={data.resolved_incidents} accent="text-severity-low" />
        <StatBox label="Avg. response (min)" value={data.average_response_minutes ?? "—"} />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <GlassCard>
          <h3 className="font-display font-medium text-ink-100 mb-4">Incidents by type</h3>
          {typeData.length === 0 ? <EmptyState title="No data yet" /> : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={typeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="name" tick={{ fill: "#7C879C", fontSize: 10 }} axisLine={false} tickLine={false} angle={-20} textAnchor="end" height={60} />
                <YAxis tick={{ fill: "#7C879C", fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ background: "#111826", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10 }} />
                <Bar dataKey="value" fill="#2DD4E8" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </GlassCard>

        <GlassCard>
          <h3 className="font-display font-medium text-ink-100 mb-4">Risk distribution</h3>
          {riskData.length === 0 ? <EmptyState title="No data yet" /> : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={riskData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={3}>
                  {riskData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Legend wrapperStyle={{ fontSize: 12, color: "#B7C0D1" }} />
                <Tooltip contentStyle={{ background: "#111826", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </GlassCard>
      </div>
    </div>
  );
}

function StatBox({ label, value, accent = "text-ink-100" }) {
  return (
    <GlassCard>
      <p className="text-xs text-ink-500">{label}</p>
      <p className={`mt-2 font-display text-2xl font-semibold ${accent}`}>{value}</p>
    </GlassCard>
  );
}
