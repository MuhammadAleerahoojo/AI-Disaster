import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Waves, Flame, Activity, ShieldCheck, Thermometer, Droplets, Wind, Gauge, CloudRain,
  MapPin, Bell,
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import GlassCard from "../components/GlassCard";
import Badge from "../components/Badge";
import RiskGauge from "../components/RiskGauge";
import { SkeletonCard } from "../components/Skeleton";
import EmptyState from "../components/EmptyState";
import { getLocationRisk, listAlerts, getPredictionHistory } from "../services/api";
import { timeAgo } from "../utils/severity";
import { useToast } from "../context/ToastContext";

const DEFAULT_LOCATION = { latitude: 24.8607, longitude: 67.0011, label: "Karachi, Pakistan" };

export default function DashboardPage() {
  const [risk, setRisk] = useState(null);
  const [loadingRisk, setLoadingRisk] = useState(true);
  const [alerts, setAlerts] = useState([]);
  const [history, setHistory] = useState([]);
  const { push } = useToast();

  useEffect(() => {
    getLocationRisk({ latitude: DEFAULT_LOCATION.latitude, longitude: DEFAULT_LOCATION.longitude, location_label: DEFAULT_LOCATION.label })
      .then(setRisk)
      .catch(() => push("Could not load current risk overview.", "error"))
      .finally(() => setLoadingRisk(false));

    listAlerts({ limit: 6 }).then(setAlerts).catch(() => {});
    getPredictionHistory({ limit: 20 }).then(setHistory).catch(() => {});
  }, []);

  const floodTrend = buildTrend(history, "FLOOD");
  const fireTrend = buildTrend(history, "FIRE");

  return (
    <div className="space-y-6 pb-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink-100">Command Center</h1>
          <p className="text-sm text-ink-500 flex items-center gap-1.5 mt-1">
            <MapPin size={13} /> {DEFAULT_LOCATION.label}
          </p>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {loadingRisk ? (
          Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
        ) : (
          <>
            <RiskCard icon={Waves} title="Flood Risk" score={risk?.flood_risk_score} level={risk?.flood_risk_level} trend="Live from weather feed" />
            <RiskCard icon={Flame} title="Fire Risk" score={risk?.fire_risk_score} level={risk?.fire_risk_level} trend="Live from weather feed" />
            <RiskCard icon={Activity} title="Earthquake Activity" score={Math.min((risk?.earthquake_recent_activity || 0) / 10, 1)} level={risk?.earthquake_recent_activity > 3 ? "HIGH" : "LOW"} trend={`${risk?.earthquake_recent_activity ?? 0} events nearby (300km)`} customLabel={`${risk?.earthquake_recent_activity ?? 0} events`} />
            <RiskCard icon={ShieldCheck} title="Overall Regional Risk" score={risk?.overall_risk_score} level={risk?.overall_risk_level} trend="Combined weighted score" />
          </>
        )}
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <GlassCard className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-medium text-ink-100">Risk Trend</h2>
            <span className="text-xs text-ink-500">Last {history.length} predictions</span>
          </div>
          {floodTrend.length > 1 || fireTrend.length > 1 ? (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="index" allowDuplicatedCategory={false} tick={{ fill: "#7C879C", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#7C879C", fontSize: 11 }} axisLine={false} tickLine={false} domain={[0, 1]} />
                <Tooltip contentStyle={{ background: "#111826", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10 }} labelStyle={{ color: "#EEF1F6" }} />
                <Line data={floodTrend} type="monotone" dataKey="score" name="Flood" stroke="#2DD4E8" strokeWidth={2} dot={false} />
                <Line data={fireTrend} type="monotone" dataKey="score" name="Fire" stroke="#F97316" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState icon={Activity} title="No prediction history yet" description="Run a prediction from the Predictions page to start building a trend." />
          )}
        </GlassCard>

        <GlassCard>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-medium text-ink-100">Live Alerts</h2>
            <Bell size={16} className="text-ink-500" />
          </div>
          {alerts.length === 0 ? (
            <EmptyState icon={Bell} title="No active alerts" description="You're all clear for now." />
          ) : (
            <div className="space-y-3 max-h-[260px] overflow-y-auto pr-1">
              {alerts.map((a) => (
                <div key={a.id} className="rounded-xl bg-white/5 border border-white/5 p-3">
                  <div className="flex items-center justify-between">
                    <Badge level={a.severity} />
                    <span className="text-[11px] text-ink-500">{timeAgo(a.created_at)}</span>
                  </div>
                  <p className="mt-2 text-sm text-ink-100 font-medium">{a.title}</p>
                  {a.location_label && <p className="text-xs text-ink-500 mt-0.5">{a.location_label}</p>}
                </div>
              ))}
            </div>
          )}
        </GlassCard>
      </div>

      <WeatherStrip weather={risk?.weather} />
    </div>
  );
}

function RiskCard({ icon: Icon, title, score = 0, level = "LOW", trend, customLabel }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <GlassCard>
        <div className="flex items-center justify-between">
          <div className="h-9 w-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
            <Icon size={16} className="text-cyan-accent" />
          </div>
          <Badge level={level} />
        </div>
        <div className="mt-4 flex items-center justify-between">
          <div>
            <p className="text-sm text-ink-500">{title}</p>
            <p className="font-display text-xl font-semibold text-ink-100 mt-1">{customLabel || `${Math.round((score || 0) * 100)}%`}</p>
            <p className="text-[11px] text-ink-500 mt-1">{trend}</p>
          </div>
          <RiskGauge score={score || 0} level={level} size={56} strokeWidth={5} />
        </div>
      </GlassCard>
    </motion.div>
  );
}

function WeatherStrip({ weather }) {
  const items = [
    { icon: Thermometer, label: "Temperature", value: weather?.temperature_c != null ? `${weather.temperature_c}°C` : "—" },
    { icon: Droplets, label: "Humidity", value: weather?.humidity_pct != null ? `${weather.humidity_pct}%` : "—" },
    { icon: Wind, label: "Wind", value: weather?.wind_speed_kmh != null ? `${weather.wind_speed_kmh} km/h` : "—" },
    { icon: CloudRain, label: "Rainfall", value: weather?.rainfall_mm != null ? `${weather.rainfall_mm} mm` : "—" },
    { icon: Gauge, label: "Pressure", value: weather?.pressure_hpa != null ? `${weather.pressure_hpa} hPa` : "—" },
  ];
  return (
    <GlassCard>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display font-medium text-ink-100">Weather Conditions</h2>
        {!weather && <span className="text-xs text-ink-500">Live feed unavailable — showing placeholders</span>}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        {items.map((it) => (
          <div key={it.label} className="flex items-center gap-2.5">
            <it.icon size={16} className="text-ink-500 shrink-0" />
            <div>
              <p className="text-sm text-ink-100 font-medium">{it.value}</p>
              <p className="text-[11px] text-ink-500">{it.label}</p>
            </div>
          </div>
        ))}
      </div>
    </GlassCard>
  );
}

function buildTrend(history, hazardType) {
  return history
    .filter((h) => h.hazard_type === hazardType)
    .slice()
    .reverse()
    .map((h, i) => ({ index: i + 1, score: h.risk_score }));
}
