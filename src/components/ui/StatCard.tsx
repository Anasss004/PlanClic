import type { LucideIcon } from "lucide-react";

export default function StatCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-light/40">
        <Icon size={18} strokeWidth={1.75} className="text-brand-dark" />
      </div>
      <p className="mt-4 text-2xl font-semibold tracking-tight text-gray-900">
        {value}
      </p>
      <p className="mt-0.5 text-sm text-gray-500">{label}</p>
      {hint && <p className="mt-2 text-xs text-gray-400">{hint}</p>}
    </div>
  );
}
