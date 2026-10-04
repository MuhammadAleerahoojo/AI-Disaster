export const SEVERITY_COLORS = {
  LOW: { text: "text-severity-low", bg: "bg-severity-low", ring: "ring-severity-low", dot: "#22C55E" },
  MODERATE: { text: "text-severity-moderate", bg: "bg-severity-moderate", ring: "ring-severity-moderate", dot: "#EAB308" },
  HIGH: { text: "text-severity-high", bg: "bg-severity-high", ring: "ring-severity-high", dot: "#F97316" },
  CRITICAL: { text: "text-severity-critical", bg: "bg-severity-critical", ring: "ring-severity-critical", dot: "#EF4444" },
};

export function severityStyle(level) {
  return SEVERITY_COLORS[level] || SEVERITY_COLORS.MODERATE;
}

export function timeAgo(dateString) {
  if (!dateString) return "—";
  const date = new Date(dateString);
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export const INCIDENT_TYPES = [
  "FIRE", "FLOOD", "EARTHQUAKE_DAMAGE", "MEDICAL_EMERGENCY",
  "TRAPPED_PERSON", "INFRASTRUCTURE_DAMAGE", "OTHER",
];

export const INCIDENT_STATUSES = [
  "REPORTED", "UNDER_REVIEW", "VERIFIED", "ASSIGNED", "IN_PROGRESS", "RESOLVED",
];

export function formatLabel(value) {
  if (!value) return "";
  return value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}
