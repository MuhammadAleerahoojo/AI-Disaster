export default function GlassCard({ children, className = "", ...props }) {
  return (
    <div className={`glass rounded-2xl p-5 ${className}`} {...props}>
      {children}
    </div>
  );
}
