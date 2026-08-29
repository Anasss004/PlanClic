// Graphique en barres minimaliste (aucune dépendance) — cohérent avec
// le thème dash-*. Deux séries superposables via `serie2`.

export type PointGraphe = {
  label: string;
  valeur: number;
  valeur2?: number;
};

export default function MiniBarChart({
  points,
  suffixe = "",
  legende,
  legende2,
}: {
  points: PointGraphe[];
  suffixe?: string;
  legende?: string;
  legende2?: string;
}) {
  const max = Math.max(1, ...points.map((p) => Math.max(p.valeur, p.valeur2 ?? 0)));

  return (
    <div>
      {(legende || legende2) && (
        <div className="mb-3 flex gap-4 text-xs text-dash-text-secondary">
          {legende && (
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-dash-sidebar" />
              {legende}
            </span>
          )}
          {legende2 && (
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-dash-accent" />
              {legende2}
            </span>
          )}
        </div>
      )}
      <div className="flex items-end gap-2" style={{ height: 160 }}>
        {points.map((p) => (
          <div key={p.label} className="flex flex-1 flex-col items-center gap-1">
            <div className="flex w-full flex-1 items-end justify-center gap-0.5">
              <div
                className="w-full max-w-[26px] rounded-t bg-dash-sidebar"
                style={{ height: `${(p.valeur / max) * 100}%` }}
                title={`${p.label} : ${p.valeur.toLocaleString("fr-FR")}${suffixe}`}
              />
              {p.valeur2 !== undefined && (
                <div
                  className="w-full max-w-[26px] rounded-t bg-dash-accent"
                  style={{ height: `${(p.valeur2 / max) * 100}%` }}
                  title={`${p.label} : ${p.valeur2.toLocaleString("fr-FR")}`}
                />
              )}
            </div>
            <span className="text-[10px] font-medium text-dash-text-secondary">
              {p.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
