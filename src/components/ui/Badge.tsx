const VARIANTS = {
  neutral: "bg-[#e3e2e3] text-dash-text-secondary",
  warning: "bg-[#feca5e] text-[#755400]",
  success: "bg-[#a6f4c5] text-[#006c4a]",
  danger: "bg-[#ffdad6] text-[#ba1a1a]",
  info: "bg-[#c5e8fa] text-dash-dark",
  brand: "bg-dash-accent/20 text-[#7b5900] border border-dash-accent/30",
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
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold tracking-wide ${VARIANTS[variant]}`}
    >
      {children}
    </span>
  );
}
