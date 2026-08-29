import type { LucideIcon } from "lucide-react";
import { TrendingUp, TrendingDown } from "lucide-react";

const VARIANTS = {
  blue: "bg-[#c5e8fa]",
  gold: "bg-[#ffdea4]",
  gray: "bg-[#e3e2e3]",
  red: "bg-[#ffdad6]",
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
  return (
    <div className="rounded-xl border border-[rgba(193,199,203,0.3)] bg-white p-[25px] shadow-[0px_4px_10px_rgba(43,76,91,0.05)]">
      <div className="flex items-start justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-dash-text-secondary">
          {label}
        </p>
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${VARIANTS[variant]}`}>
          <Icon size={18} strokeWidth={1.75} className="text-dash-dark" />
        </div>
      </div>

      <p className="mt-4 text-[32px] font-bold leading-tight tracking-tight text-dash-dark">
        {value}
      </p>

      {trend && (
        <p
          className={`mt-1 flex items-center gap-1 text-sm ${
            trend.direction === "up" ? "text-[#006c4a]" : "text-[#ba1a1a]"
          }`}
        >
          {trend.direction === "up" ? (
            <TrendingUp size={13} strokeWidth={2} />
          ) : (
            <TrendingDown size={13} strokeWidth={2} />
          )}
          {trend.label}
        </p>
      )}

      {hint && !trend && (
        <p className="mt-1 text-sm text-dash-text-secondary">{hint}</p>
      )}
    </div>
  );
}
