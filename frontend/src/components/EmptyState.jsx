export default function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-14 px-6">
      {Icon && (
        <div className="mb-4 h-12 w-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
          <Icon size={22} className="text-ink-500" />
        </div>
      )}
      <h3 className="font-display text-lg text-ink-100">{title}</h3>
      {description && <p className="mt-1.5 text-sm text-ink-500 max-w-sm">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
