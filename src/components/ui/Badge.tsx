const VARIANTS = {
  neutral: "bg-slate-100 text-slate-700 border border-slate-200/80",
  warning: "bg-amber-50 text-amber-900 border border-amber-200/80",
  success: "bg-emerald-50 text-emerald-800 border border-emerald-200/80",
  danger: "bg-rose-50 text-rose-800 border border-rose-200/80",
  info: "bg-sky-50 text-sky-800 border border-sky-200/80",
  brand: "bg-dash-accent/20 text-dash-dark border border-dash-accent/40 font-bold",
} as const;

export default function Badge({
  children,
  variant = "neutral",
}: {
  children: React.ReactNode;
  variant?: keyof typeof VARIANTS;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold tracking-tight shadow-2xs ${VARIANTS[variant]}`}
    >
      {children}
    </span>
  );
}
