type Periode = { debut: string; fin: string; type: "reservation" | "blocage" };

function joursDuMois(annee: number, mois: number) {
  return new Date(annee, mois + 1, 0).getDate();
}

function estDansPeriode(date: Date, periodes: Periode[]) {
  const iso = date.toISOString().slice(0, 10);
  return periodes.find((p) => iso >= p.debut && iso <= p.fin);
}

export default function CalendrierVehicule({ periodes }: { periodes: Periode[] }) {
  const aujourdhui = new Date();
  const mois = [0, 1, 2].map((offset) => {
    const d = new Date(aujourdhui.getFullYear(), aujourdhui.getMonth() + offset, 1);
    return { annee: d.getFullYear(), mois: d.getMonth() };
  });

  return (
    <div className="grid gap-6 sm:grid-cols-3">
      {mois.map(({ annee, mois: m }) => {
        const nbJours = joursDuMois(annee, m);
        const premierJourSemaine = (new Date(annee, m, 1).getDay() + 6) % 7; // lundi = 0
        const cases = Array(premierJourSemaine).fill(null);
        for (let j = 1; j <= nbJours; j++) cases.push(j);

        return (
          <div key={`${annee}-${m}`}>
            <p className="mb-2 text-center text-xs font-semibold capitalize text-brand-dark">
              {new Date(annee, m, 1).toLocaleDateString("fr-FR", {
                month: "long",
                year: "numeric",
              })}
            </p>
            <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-gray-400">
              {["L", "M", "M", "J", "V", "S", "D"].map((j, i) => (
                <span key={i}>{j}</span>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {cases.map((jour, i) => {
                if (jour === null) return <span key={i} />;
                const date = new Date(annee, m, jour);
                const periode = estDansPeriode(date, periodes);
                return (
                  <div
                    key={i}
                    title={periode?.type === "blocage" ? "Bloqué (hors PlanClic)" : periode ? "Réservé" : "Disponible"}
                    className={`flex h-6 items-center justify-center rounded text-[10px] ${
                      periode?.type === "blocage"
                        ? "bg-amber-200 text-amber-800"
                        : periode
                        ? "bg-brand-dark text-white"
                        : "text-gray-500"
                    }`}
                  >
                    {jour}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      <div className="col-span-full flex flex-wrap gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-brand-dark" /> Réservé (PlanClic)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-amber-200" /> Bloqué (hors PlanClic)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded border border-gray-300" /> Disponible
        </span>
      </div>
    </div>
  );
}
