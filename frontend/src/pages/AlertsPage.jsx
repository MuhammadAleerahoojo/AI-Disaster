import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Bell, BellOff, Filter, MapPin } from "lucide-react";
import GlassCard from "../components/GlassCard";
import Badge from "../components/Badge";
import EmptyState from "../components/EmptyState";
import { SkeletonCard } from "../components/Skeleton";
import { listAlerts, markAlertRead } from "../services/api";
import { timeAgo, formatLabel } from "../utils/severity";

const SEVERITIES = ["ALL", "LOW", "MODERATE", "HIGH", "CRITICAL"];

export default function AlertsPage() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [severity, setSeverity] = useState("ALL");
  const [unreadOnly, setUnreadOnly] = useState(false);

  const load = () => {
    setLoading(true);
    const params = { limit: 50 };
    if (severity !== "ALL") params.severity = severity;
    if (unreadOnly) params.unread_only = true;
    listAlerts(params).then(setAlerts).finally(() => setLoading(false));
  };

  useEffect(load, [severity, unreadOnly]);

  const handleRead = async (id) => {
    await markAlertRead(id);
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, is_read: true } : a)));
  };

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink-100">Notification Center</h1>
          <p className="text-sm text-ink-500 mt-1">Alerts triggered when hazard risk crosses safety thresholds.</p>
        </div>
        <button
          onClick={() => setUnreadOnly((u) => !u)}
          className={`flex items-center gap-2 text-sm px-3.5 py-2 rounded-xl border transition-colors ${
            unreadOnly ? "bg-cyan-accent/10 border-cyan-accent/30 text-cyan-accent" : "border-white/10 text-ink-300 hover:text-ink-100"
          }`}
        >
          {unreadOnly ? <Bell size={15} /> : <BellOff size={15} />} Unread only
        </button>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <Filter size={14} className="text-ink-500 shrink-0" />
        {SEVERITIES.map((s) => (
          <button
            key={s}
            onClick={() => setSeverity(s)}
            className={`text-xs px-3 py-1.5 rounded-full border shrink-0 transition-colors ${
              severity === s ? "bg-white/10 border-white/20 text-ink-100" : "border-white/10 text-ink-500 hover:text-ink-300"
            }`}
          >
            {formatLabel(s)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid sm:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : alerts.length === 0 ? (
        <EmptyState icon={Bell} title="No alerts match your filters" description="Try a different severity or turn off the unread filter." />
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {alerts.map((a) => (
            <motion.div key={a.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
              <GlassCard className={a.is_read ? "opacity-60" : ""}>
                <div className="flex items-center justify-between">
                  <Badge level={a.severity} />
                  <span className="text-[11px] text-ink-500">{timeAgo(a.created_at)}</span>
                </div>
                <h3 className="mt-3 font-display font-medium text-ink-100">{a.title}</h3>
                <p className="text-xs text-ink-500 mt-1">{formatLabel(a.disaster_type)} · {a.alert_type}</p>
                {a.location_label && (
                  <p className="text-xs text-ink-500 mt-1 flex items-center gap-1"><MapPin size={11} /> {a.location_label}</p>
                )}
                {a.recommended_action && <p className="mt-2.5 text-sm text-ink-300">{a.recommended_action}</p>}
                {!a.is_read && (
                  <button onClick={() => handleRead(a.id)} className="mt-3 text-xs text-cyan-accent hover:underline">
                    Mark as read
                  </button>
                )}
              </GlassCard>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
