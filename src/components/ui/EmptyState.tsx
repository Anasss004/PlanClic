import type { LucideIcon } from "lucide-react";

export default function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-dash-border bg-white px-6 py-14 text-center">
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-dash-accent/20">
        <Icon size={20} strokeWidth={1.75} className="text-dash-dark" />
      </div>
      <p className="text-sm font-semibold text-dash-text">{title}</p>
      <p className="mt-1 max-w-xs text-sm text-dash-text-secondary">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
