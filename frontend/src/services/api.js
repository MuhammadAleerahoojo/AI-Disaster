import axios from "axios";

/* ═══════════════════════════════════════════════════════════════
   API CLIENT
   ═══════════════════════════════════════════════════════════════ */

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  "http://localhost:8000";

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: { "Content-Type": "application/json" },
});

/* ─── Request interceptor (auth) ─── */
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("dp_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/* ─── Response interceptor (error logging) ─── */
api.interceptors.response.use(
  (res) => res,
  (err) => {
    console.error("[API Error]", err?.response?.status, err?.message);
    return Promise.reject(err);
  }
);

export const UPLOADS_BASE_URL = API_BASE_URL;

/* ═══════════════════════════════════════════════════════════════
   AUTH
   ═══════════════════════════════════════════════════════════════ */

export const registerUser = (payload) =>
  api.post("/api/auth/register", payload).then((r) => r.data);

export const loginUser = (payload) =>
  api.post("/api/auth/login", payload).then((r) => r.data);

export const getMe = () => api.get("/api/auth/me").then((r) => r.data);

/* ═══════════════════════════════════════════════════════════════
   PREDICTIONS
   ═══════════════════════════════════════════════════════════════ */

export const predictFlood = (payload) =>
  api.post("/api/predictions/flood", payload).then((r) => r.data);

export const predictFire = (payload) =>
  api.post("/api/predictions/fire", payload).then((r) => r.data);

export const getPredictionHistory = (params) =>
  api.get("/api/predictions/history", { params }).then((r) => r.data);

/* ═══════════════════════════════════════════════════════════════
   HAZARDS
   ═══════════════════════════════════════════════════════════════ */

export const getEarthquakes = (params) =>
  api.get("/api/earthquakes", { params }).then((r) => r.data);

export const getFires = (params) =>
  api.get("/api/fires", { params }).then((r) => r.data);

export const getWeather = (latitude, longitude) =>
  api
    .get("/api/weather", { params: { latitude, longitude } })
    .then((r) => r.data);

export const getLocationRisk = (payload) =>
  api.post("/api/risk", payload).then((r) => r.data);

/* ═══════════════════════════════════════════════════════════════
   INCIDENTS
   ═══════════════════════════════════════════════════════════════ */

export const createIncident = (formData) =>
  api
    .post("/api/incidents", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    })
    .then((r) => r.data);

export const listIncidents = (params) =>
  api.get("/api/incidents", { params }).then((r) => r.data);

export const getIncident = (id) =>
  api.get(`/api/incidents/${id}`).then((r) => r.data);

export const updateIncidentStatus = (id, status) =>
  api.patch(`/api/incidents/${id}/status`, { status }).then((r) => r.data);

/* ═══════════════════════════════════════════════════════════════
   ALERTS
   ═══════════════════════════════════════════════════════════════ */

export const listAlerts = (params) =>
  api.get("/api/alerts", { params }).then((r) => r.data);

export const markAlertRead = (id) =>
  api.patch(`/api/alerts/${id}/read`).then((r) => r.data);

/* ═══════════════════════════════════════════════════════════════
   RESCUE
   ═══════════════════════════════════════════════════════════════ */

export const listRescueTeams = () =>
  api.get("/api/rescue/teams").then((r) => r.data);

export const listRescueOperations = (params) =>
  api.get("/api/rescue/operations", { params }).then((r) => r.data);

export const createRescueOperation = (payload) =>
  api.post("/api/rescue/operations", payload).then((r) => r.data);

export const updateRescueOperation = (id, payload) =>
  api.patch(`/api/rescue/operations/${id}`, payload).then((r) => r.data);

/* ═══════════════════════════════════════════════════════════════
   CHAT  (single source of truth — sends location too)
   ═══════════════════════════════════════════════════════════════ */

export const sendChatMessage = ({ session_id, message, location } = {}) =>
  api
    .post("/api/chat", {
      session_id,
      message,
      latitude: location?.lat,
      longitude: location?.lng,
    })
    .then((r) => r.data);

/* ═══════════════════════════════════════════════════════════════
   SAFE PLACES
   ═══════════════════════════════════════════════════════════════ */

export const getSafePlaces = (latitude, longitude, radiusKm = 5) =>
  api
    .get("/api/safe-places", {
      params: {
        latitude,
        longitude,
        lat: latitude,       // backend flexibility
        lng: longitude,
        radius_km: radiusKm,
      },
    })
    .then((r) => r.data.places ?? r.data);

/* ═══════════════════════════════════════════════════════════════
   EMERGENCY SERVICES  (POLICE / HOSPITAL / FIRE / ALL)
   ═══════════════════════════════════════════════════════════════ */

export const getEmergencyServices = (
  lat,
  lng,
  serviceType = "ALL",
  radiusKm = 10
) =>
  api
    .get("/api/emergency-services", {
      params: {
        lat,
        lng,
        latitude: lat,
        longitude: lng,
        type: serviceType,       // POLICE | HOSPITAL | FIRE_STATION | ALL
        radius_km: radiusKm,
        limit: 10,
      },
    })
    .then((r) => r.data.services ?? r.data);

/* ═══════════════════════════════════════════════════════════════
   ADMIN
   ═══════════════════════════════════════════════════════════════ */

export const getAnalytics = () =>
  api.get("/api/admin/analytics").then((r) => r.data);