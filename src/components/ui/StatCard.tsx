import type { LucideIcon } from "lucide-react";
import { TrendingUp, TrendingDown } from "lucide-react";

const VARIANTS = {
  blue: { bg: "bg-sky-50 text-sky-700 border-sky-100", iconBg: "bg-sky-500/10 text-sky-700" },
  gold: { bg: "bg-amber-50 text-amber-800 border-amber-100", iconBg: "bg-amber-500/10 text-amber-800" },
  gray: { bg: "bg-slate-50 text-slate-700 border-slate-100", iconBg: "bg-slate-500/10 text-slate-700" },
  red: { bg: "bg-rose-50 text-rose-700 border-rose-100", iconBg: "bg-rose-500/10 text-rose-700" },
} as const;

export default function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  variant = "blue",
  trend,
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  hint?: string;
  variant?: keyof typeof VARIANTS;
  trend?: { direction: "up" | "down"; label: string };
}) {
  const style = VARIANTS[variant] ?? VARIANTS.blue;

  return (
    <div className="card-lift relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs">
      <div className="flex items-start justify-between">
        <p className="text-[11px] font-bold uppercase tracking-wider text-dash-text-secondary/80">
          {label}
        </p>
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${style.bg}`}>
          <Icon size={20} strokeWidth={2} />
        </div>
      </div>

      <p className="mt-3 text-[32px] font-extrabold leading-tight tracking-tight text-dash-dark">
        {value}
      </p>

      {trend && (
        <div className="mt-2.5 flex items-center gap-1.5">
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
              trend.direction === "up"
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60"
                : "bg-rose-50 text-rose-700 border border-rose-200/60"
            }`}
          >
            {trend.direction === "up" ? (
              <TrendingUp size={12} strokeWidth={2.5} />
            ) : (
              <TrendingDown size={12} strokeWidth={2.5} />
            )}
            {trend.label}
          </span>
        </div>
      )}

      {hint && !trend && (
        <p className="mt-2 text-xs font-medium text-dash-text-secondary">{hint}</p>
      )}
    </div>
  );
}
