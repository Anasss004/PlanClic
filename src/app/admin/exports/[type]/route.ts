import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// ============================================================
// Export comptable / reporting — CSV (par défaut) ou tableau HTML
// imprimable (?format=html → l'utilisateur fait Cmd/Ctrl+P → PDF).
//
// Réservé au staff : double barrière (le RLS ne renverrait de toute
// façon rien à un non-staff, mais on refuse explicitement en 403).
// Chaque export est journalisé (admin_log).
// ============================================================

type Type = "utilisateurs" | "reservations" | "revenus";
const TYPES: Type[] = ["utilisateurs", "reservations", "revenus"];

function champCsv(v: unknown): string {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function versCsv(entetes: string[], lignes: unknown[][]): string {
  const corps = [entetes, ...lignes]
    .map((l) => l.map(champCsv).join(";"))
    .join("\r\n");
  // BOM pour Excel (accents)
  return "﻿" + corps;
}

function versHtml(titre: string, entetes: string[], lignes: unknown[][]): string {
  const th = entetes.map((h) => `<th>${h}</th>`).join("");
  const trs = lignes
    .map(
      (l) =>
        `<tr>${l.map((c) => `<td>${c === null || c === undefined ? "" : String(c)}</td>`).join("")}</tr>`
    )
    .join("");
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>${titre}</title>
<style>
  body{font-family:system-ui,-apple-system,"Plus Jakarta Sans",sans-serif;margin:32px;color:#1a1c1d}
  h1{font-size:20px;margin:0 0 4px}
  p.meta{color:#42484b;font-size:12px;margin:0 0 20px}
  table{border-collapse:collapse;width:100%;font-size:12px}
  th,td{border:1px solid #c1c7cb;padding:6px 8px;text-align:left}
  th{background:#f4f5f6}
  @media print{button{display:none}}
</style></head><body>
<h1>PlanClic — ${titre}</h1>
<p class="meta">Généré le ${new Date().toLocaleString("fr-FR")} · ${lignes.length} ligne(s)</p>
<button onclick="window.print()" style="margin-bottom:16px;padding:8px 14px;border:1px solid #123544;background:#123544;color:#fff;border-radius:8px;cursor:pointer">Imprimer / Enregistrer en PDF</button>
<table><thead><tr>${th}</tr></thead><tbody>${trs}</tbody></table>
</body></html>`;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ type: string }> }
) {
  const { type } = await params;
  if (!TYPES.includes(type as Type)) {
    return new NextResponse("Type d'export inconnu", { status: 404 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Non authentifié", { status: 401 });

  const { data: profil } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (!profil || !["support", "admin"].includes(profil.role)) {
    return new NextResponse("Accès refusé", { status: 403 });
  }

  let titre = "";
  let entetes: string[] = [];
  let lignes: unknown[][] = [];

  if (type === "utilisateurs") {
    titre = "Utilisateurs";
    entetes = ["Prénom", "Nom", "Email", "Téléphone", "Rôle", "Inscrit le"];
    const { data } = await supabase
      .from("profiles")
      .select("prenom, nom, email, telephone, role, created_at")
      .order("created_at", { ascending: false });
    lignes = (data ?? []).map((u) => [
      u.prenom,
      u.nom,
      u.email,
      u.telephone ?? "",
      u.role,
      new Date(u.created_at).toLocaleDateString("fr-FR"),
    ]);
  } else if (type === "reservations") {
    titre = "Réservations";
    entetes = [
      "ID",
      "Agence",
      "Véhicule",
      "Début",
      "Fin",
      "Statut",
      "Source",
      "Montant (MAD)",
      "Créée le",
    ];
    const { data } = await supabase
      .from("reservations")
      .select(
        "id, date_debut, date_fin, statut, source, prix_total, created_at, vehicules(marque, modele), proprietaires(nom_entreprise)"
      )
      .order("created_at", { ascending: false });
    lignes = (data ?? []).map((r) => {
      const v = Array.isArray(r.vehicules) ? r.vehicules[0] : r.vehicules;
      const p = Array.isArray(r.proprietaires) ? r.proprietaires[0] : r.proprietaires;
      return [
        r.id,
        p?.nom_entreprise ?? "",
        v ? `${v.marque} ${v.modele}` : "",
        r.date_debut,
        r.date_fin,
        r.statut,
        r.source,
        r.prix_total ?? "",
        new Date(r.created_at).toLocaleDateString("fr-FR"),
      ];
    });
  } else {
    titre = "Revenus par agence";
    entetes = [
      "Agence",
      "Ville",
      "Réservations terminées",
      "CA généré (MAD)",
    ];
    const { data: agences } = await supabase
      .from("proprietaires")
      .select("id, nom_entreprise, ville")
      .order("nom_entreprise", { ascending: true });
    const { data: resa } = await supabase
      .from("reservations")
      .select("proprietaire_id, prix_total")
      .eq("statut", "terminee");

    const parAgence = new Map<string, { nb: number; ca: number }>();
    (resa ?? []).forEach((r) => {
      const e = parAgence.get(r.proprietaire_id) ?? { nb: 0, ca: 0 };
      e.nb += 1;
      e.ca += r.prix_total ?? 0;
      parAgence.set(r.proprietaire_id, e);
    });
    lignes = (agences ?? []).map((a) => {
      const e = parAgence.get(a.id) ?? { nb: 0, ca: 0 };
      return [a.nom_entreprise, a.ville, e.nb, e.ca];
    });
  }

  try {
    await supabase.rpc("admin_log", {
      p_action: "export.telechargement",
      p_resource_type: "exports",
      p_resource_id: null,
      p_metadata: { type, lignes: lignes.length },
    });
  } catch {
    // la journalisation ne doit pas bloquer le téléchargement
  }

  const format = request.nextUrl.searchParams.get("format");
  const dateStr = new Date().toISOString().slice(0, 10);

  if (format === "html") {
    return new NextResponse(versHtml(titre, entetes, lignes), {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  return new NextResponse(versCsv(entetes, lignes), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="planclic-${type}-${dateStr}.csv"`,
    },
  });
}
