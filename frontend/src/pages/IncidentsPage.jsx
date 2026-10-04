import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X, Upload, LoaderCircle, MapPin, Users, CheckCircle2 } from "lucide-react";
import GlassCard from "../components/GlassCard";
import Badge from "../components/Badge";
import EmptyState from "../components/EmptyState";
import { SkeletonCard } from "../components/Skeleton";
import { listIncidents, createIncident } from "../services/api";
import { INCIDENT_TYPES, INCIDENT_STATUSES, formatLabel, timeAgo } from "../utils/severity";
import { useToast } from "../context/ToastContext";

export default function IncidentsPage() {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [modalOpen, setModalOpen] = useState(false);

  const load = () => {
    setLoading(true);
    const params = { limit: 100 };
    if (statusFilter !== "ALL") params.status_filter = statusFilter;
    listIncidents(params).then(setIncidents).finally(() => setLoading(false));
  };

  useEffect(load, [statusFilter]);

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink-100">Incident Reports</h1>
          <p className="text-sm text-ink-500 mt-1">SOS reports from the field, tracked from submission to resolution.</p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 bg-cyan-accent text-base-950 font-medium text-sm px-4 py-2.5 rounded-xl hover:brightness-110 transition"
        >
          <Plus size={16} /> Report Incident
        </button>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {["ALL", ...INCIDENT_STATUSES].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`text-xs px-3 py-1.5 rounded-full border shrink-0 transition-colors ${
              statusFilter === s ? "bg-white/10 border-white/20 text-ink-100" : "border-white/10 text-ink-500 hover:text-ink-300"
            }`}
          >
            {formatLabel(s)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : incidents.length === 0 ? (
        <EmptyState icon={Plus} title="No incidents reported" description="Reports you or others submit will appear here." />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {incidents.map((inc) => (
            <motion.div key={inc.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
              <GlassCard>
                <div className="flex items-center justify-between">
                  <Badge level={inc.severity} />
                  <span className="text-[11px] text-ink-500">{timeAgo(inc.created_at)}</span>
                </div>
                <p className="mt-3 text-xs text-cyan-accent font-mono">{inc.incident_code}</p>
                <h3 className="mt-1 font-display font-medium text-ink-100">{formatLabel(inc.incident_type)}</h3>
                <p className="mt-1.5 text-sm text-ink-300 line-clamp-2">{inc.description}</p>
                <div className="mt-3 flex items-center justify-between text-xs text-ink-500">
                  <span className="flex items-center gap-1"><MapPin size={11} /> {inc.location_label || "Unlabeled"}</span>
                  <span className="flex items-center gap-1"><Users size={11} /> {inc.affected_people}</span>
                </div>
                <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between">
                  <span className="text-xs px-2 py-1 rounded-full bg-white/5 text-ink-300">{formatLabel(inc.status)}</span>
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {modalOpen && <ReportModal onClose={() => setModalOpen(false)} onCreated={load} />}
      </AnimatePresence>
    </div>
  );
}

function ReportModal({ onClose, onCreated }) {
  const [form, setForm] = useState({
    incident_type: "OTHER", description: "", latitude: "", longitude: "",
    location_label: "", severity: "MODERATE", affected_people: 0, contact_info: "",
  });
  const [photo, setPhoto] = useState(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(null);
  const { push } = useToast();

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const useMyLocation = () => {
    if (!navigator.geolocation) return push("Geolocation not supported by this browser.", "warning");
    navigator.geolocation.getCurrentPosition(
      (pos) => setForm((f) => ({ ...f, latitude: pos.coords.latitude.toFixed(5), longitude: pos.coords.longitude.toFixed(5) })),
      () => push("Could not access your location.", "error")
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.latitude || !form.longitude) return push("Please provide a location.", "warning");
    setLoading(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      if (photo) fd.append("photo", photo);
      const data = await createIncident(fd);
      setSuccess(data);
      onCreated();
    } catch (err) {
      push(err?.response?.data?.detail || "Could not submit report.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 z-50" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
        className="fixed inset-x-4 top-[6%] sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 max-w-lg w-full glass rounded-2xl p-6 z-50 max-h-[88vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display text-lg font-semibold text-ink-100">
            {success ? "Report submitted" : "Report an incident"}
          </h2>
          <button onClick={onClose} className="text-ink-500 hover:text-ink-100"><X size={18} /></button>
        </div>

        {success ? (
          <div className="text-center py-6">
            <CheckCircle2 size={40} className="mx-auto text-severity-low" />
            <p className="mt-4 text-ink-100 font-medium">Incident code</p>
            <p className="font-mono text-cyan-accent text-lg mt-1">{success.incident_code}</p>
            <p className="text-sm text-ink-500 mt-2">Status: {formatLabel(success.status)}</p>
            <button onClick={onClose} className="mt-6 w-full bg-cyan-accent text-base-950 font-medium py-2.5 rounded-xl hover:brightness-110">
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-xs font-medium text-ink-500">Incident type</span>
                <select value={form.incident_type} onChange={update("incident_type")} className="mt-1.5 w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2.5 text-sm text-ink-100 outline-none">
                  {INCIDENT_TYPES.map((t) => <option key={t} value={t}>{formatLabel(t)}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="text-xs font-medium text-ink-500">Severity</span>
                <select value={form.severity} onChange={update("severity")} className="mt-1.5 w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2.5 text-sm text-ink-100 outline-none">
                  {["LOW", "MODERATE", "HIGH", "CRITICAL"].map((s) => <option key={s} value={s}>{formatLabel(s)}</option>)}
                </select>
              </label>
            </div>

            <label className="block">
              <span className="text-xs font-medium text-ink-500">Description</span>
              <textarea required rows={3} value={form.description} onChange={update("description")}
                className="mt-1.5 w-full rounded-xl bg-white/5 border border-white/10 px-3.5 py-2.5 text-sm text-ink-100 outline-none resize-none" />
            </label>

            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-ink-500">Location</span>
              <button type="button" onClick={useMyLocation} className="text-xs text-cyan-accent hover:underline flex items-center gap-1">
                <MapPin size={12} /> Use my location
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input required type="number" step="any" placeholder="Latitude" value={form.latitude} onChange={update("latitude")}
                className="rounded-xl bg-white/5 border border-white/10 px-3.5 py-2.5 text-sm text-ink-100 outline-none" />
              <input required type="number" step="any" placeholder="Longitude" value={form.longitude} onChange={update("longitude")}
                className="rounded-xl bg-white/5 border border-white/10 px-3.5 py-2.5 text-sm text-ink-100 outline-none" />
            </div>
            <input type="text" placeholder="Location label (optional)" value={form.location_label} onChange={update("location_label")}
              className="w-full rounded-xl bg-white/5 border border-white/10 px-3.5 py-2.5 text-sm text-ink-100 outline-none" />

            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-xs font-medium text-ink-500">People affected</span>
                <input type="number" min="0" value={form.affected_people} onChange={update("affected_people")}
                  className="mt-1.5 w-full rounded-xl bg-white/5 border border-white/10 px-3.5 py-2.5 text-sm text-ink-100 outline-none" />
              </label>
              <label className="block">
                <span className="text-xs font-medium text-ink-500">Contact (optional)</span>
                <input type="text" value={form.contact_info} onChange={update("contact_info")}
                  className="mt-1.5 w-full rounded-xl bg-white/5 border border-white/10 px-3.5 py-2.5 text-sm text-ink-100 outline-none" />
              </label>
            </div>

            <label className="flex items-center gap-2.5 rounded-xl border border-dashed border-white/15 px-3.5 py-3 cursor-pointer hover:border-cyan-accent/40 transition-colors">
              <Upload size={16} className="text-ink-500" />
              <span className="text-sm text-ink-500 truncate">{photo ? photo.name : "Attach a photo (optional, max 5MB)"}</span>
              <input type="file" accept="image/*" className="hidden" onChange={(e) => setPhoto(e.target.files?.[0] || null)} />
            </label>

            <button type="submit" disabled={loading} className="w-full flex items-center justify-center gap-2 bg-cyan-accent text-base-950 font-medium py-3 rounded-xl hover:brightness-110 transition disabled:opacity-60">
              {loading ? <LoaderCircle size={18} className="animate-spin" /> : "Submit report"}
            </button>
          </form>
        )}
      </motion.div>
    </>
  );
}
