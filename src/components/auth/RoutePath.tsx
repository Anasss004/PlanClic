const STOPS = [
  { cx: 40, cy: 60, label: "Marrakech" },
  { cx: 150, cy: 230, label: "Casablanca" },
  { cx: 60, cy: 400, label: "Rabat" },
];

export default function RoutePath() {
  return (
    <svg
      viewBox="0 0 220 460"
      className="absolute bottom-0 right-0 h-[420px] w-[210px] opacity-40"
      fill="none"
      aria-hidden
    >
      <path
        d="M40,60 C160,110 20,170 150,230 C260,280 -20,330 60,400"
        stroke="white"
        strokeWidth="2"
        strokeDasharray="2 8"
        strokeLinecap="round"
      />
      {STOPS.map((s, i) => (
        <g key={s.label}>
          <circle cx={s.cx} cy={s.cy} r="5" fill="#FFC93C" />
          <circle
            cx={s.cx}
            cy={s.cy}
            r="9"
            stroke="#FFC93C"
            strokeWidth="1"
            opacity="0.5"
          />
          <text
            x={s.cx + (i % 2 === 0 ? 16 : -16)}
            y={s.cy + 4}
            fill="white"
            fontSize="11"
            textAnchor={i % 2 === 0 ? "start" : "end"}
            fontFamily="var(--font-inter)"
          >
            {s.label}
          </text>
        </g>
      ))}
    </svg>
  );
}
