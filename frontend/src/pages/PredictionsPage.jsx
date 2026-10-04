import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Waves, Flame, LoaderCircle, Sparkles } from "lucide-react";
import GlassCard from "../components/GlassCard";
import Badge from "../components/Badge";
import RiskGauge from "../components/RiskGauge";
import { predictFlood, predictFire } from "../services/api";
import { useToast } from "../context/ToastContext";

const FLOOD_FIELDS = [
  { key: "rainfall_mm", label: "Rainfall (mm)", default: 45 },
  { key: "temperature_c", label: "Temperature (°C)", default: 29 },
  { key: "humidity_pct", label: "Humidity (%)", default: 68 },
  { key: "wind_speed_kmh", label: "Wind speed (km/h)", default: 14 },
  { key: "pressure_hpa", label: "Pressure (hPa)", default: 1008 },
  { key: "elevation_m", label: "Elevation (m)", default: 40 },
  { key: "soil_saturation_pct", label: "Soil saturation (%)", default: 55 },
];

const FIRE_FIELDS = [
  { key: "temperature_c", label: "Temperature (°C)", default: 34 },
  { key: "humidity_pct", label: "Humidity (%)", default: 30 },
  { key: "wind_speed_kmh", label: "Wind speed (km/h)", default: 22 },
  { key: "rainfall_mm", label: "Rainfall (mm)", default: 2 },
  { key: "vegetation_index", label: "Vegetation index (0–1)", default: 0.5, step: 0.05 },
];

export default function PredictionsPage() {
  const [tab, setTab] = useState("flood");

  return (
    <div className="space-y-6 pb-10">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink-100">Risk Predictions</h1>
        <p className="text-sm text-ink-500 mt-1">Run the ML models with your own inputs to see a live risk score.</p>
      </div>

      <div className="inline-flex rounded-xl bg-white/5 border border-white/10 p-1">
        <TabButton active={tab === "flood"} onClick={() => setTab("flood")} icon={Waves} label="Flood" />
        <TabButton active={tab === "fire"} onClick={() => setTab("fire")} icon={Flame} label="Fire" />
      </div>

      <AnimatePresence mode="wait">
        {tab === "flood" ? (
          <PredictionForm key="flood" hazard="flood" fields={FLOOD_FIELDS} fn={predictFlood} accentIcon={Waves} />
        ) : (
          <PredictionForm key="fire" hazard="fire" fields={FIRE_FIELDS} fn={predictFire} accentIcon={Flame} />
        )}
      </AnimatePresence>
    </div>
  );
}

function TabButton({ active, onClick, icon: Icon, label }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
        active ? "bg-cyan-accent text-base-950" : "text-ink-300 hover:text-ink-100"
      }`}
    >
      <Icon size={15} /> {label}
    </button>
  );
}

function PredictionForm({ hazard, fields, fn, accentIcon: Icon }) {
  const [values, setValues] = useState(() => Object.fromEntries(fields.map((f) => [f.key, f.default])));
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const { push } = useToast();

  const update = (key, val) => setValues((v) => ({ ...v, [key]: parseFloat(val) }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    try {
      const payload = { latitude: 24.8607, longitude: 67.0011, ...values };
      const data = await fn(payload);
      setResult(data);
    } catch (err) {
      push("Prediction failed. Please check your inputs.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }}
      className="grid lg:grid-cols-5 gap-4"
    >
      <GlassCard className="lg:col-span-3">
        <form onSubmit={handleSubmit} className="grid sm:grid-cols-2 gap-4">
          {fields.map((f) => (
            <label key={f.key} className="block">
              <span className="text-xs font-medium text-ink-500">{f.label}</span>
              <input
                type="number"
                step={f.step || "any"}
                value={values[f.key]}
                onChange={(e) => update(f.key, e.target.value)}
                className="mt-1.5 w-full rounded-xl bg-white/5 border border-white/10 px-3.5 py-2.5 text-sm text-ink-100 focus:border-cyan-accent/50 outline-none"
              />
            </label>
          ))}
          <button
            type="submit"
            disabled={loading}
            className="sm:col-span-2 mt-2 flex items-center justify-center gap-2 rounded-xl bg-cyan-accent text-base-950 font-medium py-3 hover:brightness-110 transition disabled:opacity-60"
          >
            {loading ? <LoaderCircle size={18} className="animate-spin" /> : <><Sparkles size={16} /> Run Prediction</>}
          </button>
        </form>
      </GlassCard>

      <GlassCard className="lg:col-span-2 flex flex-col items-center justify-center text-center min-h-[280px]">
        {result ? (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
            <RiskGauge score={result.risk_score} level={result.risk_level} size={120} strokeWidth={10} />
            <div className="mt-4"><Badge level={result.risk_level} /></div>
            <p className="mt-4 text-xs font-medium text-ink-500">Top contributing factors</p>
            <div className="mt-2 space-y-1.5 text-left">
              {result.contributing_factors?.map((f) => (
                <div key={f.factor} className="flex items-center justify-between text-xs">
                  <span className="text-ink-300">{f.factor}</span>
                  <span className="text-ink-500">{Math.round(f.importance * 100)}% weight</span>
                </div>
              ))}
            </div>
          </motion.div>
        ) : (
          <div className="text-ink-500">
            <Icon size={28} className="mx-auto mb-3 text-ink-500" />
            <p className="text-sm">Run a prediction to see the risk score here.</p>
          </div>
        )}
      </GlassCard>
    </motion.div>
  );
}
