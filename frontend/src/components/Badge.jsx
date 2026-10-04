import { severityStyle, formatLabel } from "../utils/severity";

export default function Badge({ level, children }) {
  const style = severityStyle(level);
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${style.text} bg-white/5 border border-white/10`}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: style.dot }} />
      {children || formatLabel(level)}
    </span>
  );
}
