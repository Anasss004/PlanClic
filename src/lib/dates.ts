// ============================================================
// Formatage des dates pour l'affichage (jamais pour les valeurs de
// formulaire : les inputs / envois serveur restent en ISO "YYYY-MM-DD").
// ============================================================

const MOIS_COURT = [
  "janv.", "févr.", "mars", "avr.", "mai", "juin",
  "juil.", "août", "sept.", "oct.", "nov.", "déc.",
];

function parseIso(dateIso: string): Date | null {
  if (!dateIso) return null;
  // Accepte "YYYY-MM-DD" comme "YYYY-MM-DDTHH:mm:ss..."
  const base = dateIso.length === 10 ? `${dateIso}T00:00:00` : dateIso;
  const d = new Date(base);
  return Number.isNaN(d.getTime()) ? null : d;
}

// "11 sept. 2026"
export function formaterDate(dateIso: string): string {
  const d = parseIso(dateIso);
  if (!d) return dateIso ?? "";
  return `${d.getDate()} ${MOIS_COURT[d.getMonth()]} ${d.getFullYear()}`;
}

// "11 sept. → 19 sept. 2026"  (année affichée une seule fois si identique)
export function formaterPeriode(debutIso: string, finIso: string): string {
  const d1 = parseIso(debutIso);
  const d2 = parseIso(finIso);
  if (!d1 || !d2) return `${debutIso ?? ""} → ${finIso ?? ""}`;

  const memeMois = d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth();
  const memeAnnee = d1.getFullYear() === d2.getFullYear();

  const gauche = memeMois
    ? `${d1.getDate()}`
    : memeAnnee
    ? `${d1.getDate()} ${MOIS_COURT[d1.getMonth()]}`
    : `${d1.getDate()} ${MOIS_COURT[d1.getMonth()]} ${d1.getFullYear()}`;

  const droite = `${d2.getDate()} ${MOIS_COURT[d2.getMonth()]} ${d2.getFullYear()}`;

  return `${gauche} → ${droite}`;
}

// "08:30" à partir d'une valeur time Postgres ("08:30:00")
export function formaterHeure(heure?: string | null): string {
  if (!heure) return "";
  const m = /^(\d{2}):(\d{2})/.exec(heure);
  return m ? `${m[1]}h${m[2]}` : heure;
}

// Nombre de jours (>= 1) entre deux dates ISO.
export function nombreDeJours(debutIso: string, finIso: string): number {
  const d1 = parseIso(debutIso);
  const d2 = parseIso(finIso);
  if (!d1 || !d2) return 0;
  return Math.max(1, Math.round((d2.getTime() - d1.getTime()) / 86400000));
}

// "aujourd'hui" / "hier" / "il y a 3 j" / "12 sept. 2026" — pour les flux
// d'activité (notifications).
export function formaterRelatif(dateIso: string): string {
  const d = parseIso(dateIso);
  if (!d) return dateIso ?? "";
  const diffJours = Math.floor((Date.now() - d.getTime()) / 86400000);
  if (diffJours <= 0) return "aujourd'hui";
  if (diffJours === 1) return "hier";
  if (diffJours < 7) return `il y a ${diffJours} j`;
  return formaterDate(dateIso);
}
