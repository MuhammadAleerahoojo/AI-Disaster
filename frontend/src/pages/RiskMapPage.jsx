import { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from "react-leaflet";
import { Layers, Activity, Flame, FileWarning } from "lucide-react";
import GlassCard from "../components/GlassCard";
import Badge from "../components/Badge";
import { getEarthquakes, getFires, listIncidents } from "../services/api";
import { timeAgo } from "../utils/severity";

const DEFAULT_CENTER = [24.8607, 67.0011];

const LAYER_COLORS = {
  earthquake: "#EAB308",
  fire: "#F97316",
  incident: "#EF4444",
};

export default function RiskMapPage() {
  const [earthquakes, setEarthquakes] = useState([]);
  const [fires, setFires] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [layers, setLayers] = useState({ earthquake: true, fire: true, incident: true });

  useEffect(() => {
    getEarthquakes({ limit: 100 }).then(setEarthquakes).catch(() => {});
    getFires({ latitude: DEFAULT_CENTER[0], longitude: DEFAULT_CENTER[1], limit: 100 }).then(setFires).catch(() => {});
    listIncidents({ limit: 100 }).then(setIncidents).catch(() => {});
  }, []);

  const toggleLayer = (key) => setLayers((l) => ({ ...l, [key]: !l[key] }));

  return (
    <div className="space-y-4 pb-10">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink-100">Interactive Disaster Map</h1>
        <p className="text-sm text-ink-500 mt-1">Earthquakes, fire hotspots, and reported incidents in one view.</p>
      </div>

      <div className="grid lg:grid-cols-4 gap-4">
        <GlassCard className="lg:col-span-1 order-2 lg:order-1">
          <div className="flex items-center gap-2 mb-3">
            <Layers size={15} className="text-ink-500" />
            <h2 className="font-display text-sm font-medium text-ink-100">Layers</h2>
          </div>
          <div className="space-y-2">
            <LayerToggle icon={Activity} label={`Earthquakes (${earthquakes.length})`} color={LAYER_COLORS.earthquake} checked={layers.earthquake} onChange={() => toggleLayer("earthquake")} />
            <LayerToggle icon={Flame} label={`Fire hotspots (${fires.length})`} color={LAYER_COLORS.fire} checked={layers.fire} onChange={() => toggleLayer("fire")} />
            <LayerToggle icon={FileWarning} label={`Incidents (${incidents.length})`} color={LAYER_COLORS.incident} checked={layers.incident} onChange={() => toggleLayer("incident")} />
          </div>

          <div className="mt-5 pt-4 border-t border-white/5">
            <p className="text-xs font-medium text-ink-500 mb-2">Severity legend</p>
            <div className="space-y-1.5">
              {["LOW", "MODERATE", "HIGH", "CRITICAL"].map((lvl) => (
                <div key={lvl} className="flex items-center gap-2">
                  <Badge level={lvl} />
                </div>
              ))}
            </div>
          </div>
        </GlassCard>

        <div className="lg:col-span-3 order-1 lg:order-2 h-[70vh] rounded-2xl overflow-hidden border border-white/10">
          <MapContainer center={DEFAULT_CENTER} zoom={5} style={{ height: "100%", width: "100%" }} scrollWheelZoom>
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              className="map-tiles-dark"
            />

            {layers.earthquake && earthquakes.map((eq) => (
              <CircleMarker
                key={eq.id}
                center={[eq.latitude, eq.longitude]}
                radius={Math.max(4, (eq.magnitude || 2) * 2.5)}
                pathOptions={{ color: LAYER_COLORS.earthquake, fillColor: LAYER_COLORS.earthquake, fillOpacity: 0.5, weight: 1.5 }}
              >
                <Popup>
                  <p className="font-medium">{eq.place || "Unknown location"}</p>
                  <p>Magnitude: {eq.magnitude ?? "—"}</p>
                  <p>Depth: {eq.depth_km ?? "—"} km</p>
                  <p className="text-xs opacity-70">{timeAgo(eq.event_time)}{eq.is_demo_data ? " · demo data" : ""}</p>
                </Popup>
              </CircleMarker>
            ))}

            {layers.fire && fires.map((f) => (
              <CircleMarker
                key={f.id}
                center={[f.latitude, f.longitude]}
                radius={6}
                pathOptions={{ color: LAYER_COLORS.fire, fillColor: LAYER_COLORS.fire, fillOpacity: 0.6, weight: 1.5 }}
              >
                <Popup>
                  <p className="font-medium">Fire hotspot</p>
                  <p>Confidence: {f.confidence ?? "—"}</p>
                  <p>Date: {f.acq_date ?? "—"}</p>
                  <p className="text-xs opacity-70">{f.is_demo_data ? "demo data" : "NASA FIRMS"}</p>
                </Popup>
              </CircleMarker>
            ))}

            {layers.incident && incidents.map((inc) => (
              <CircleMarker
                key={inc.id}
                center={[inc.latitude, inc.longitude]}
                radius={7}
                pathOptions={{ color: LAYER_COLORS.incident, fillColor: LAYER_COLORS.incident, fillOpacity: 0.55, weight: 1.5 }}
              >
                <Popup>
                  <p className="font-medium">{inc.incident_code}</p>
                  <p>{inc.description}</p>
                  <p className="text-xs opacity-70">{inc.status} · {timeAgo(inc.created_at)}</p>
                </Popup>
              </CircleMarker>
            ))}
          </MapContainer>
        </div>
      </div>
    </div>
  );
}

function LayerToggle({ icon: Icon, label, color, checked, onChange }) {
  return (
    <label className="flex items-center justify-between cursor-pointer group">
      <span className="flex items-center gap-2 text-sm text-ink-300 group-hover:text-ink-100">
        <Icon size={14} style={{ color }} /> {label}
      </span>
      <input type="checkbox" checked={checked} onChange={onChange} className="accent-cyan-500" />
    </label>
  );
}
