import { Megaphone } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { exigerStaff } from "@/lib/admin/auth";
import EmptyState from "@/components/ui/EmptyState";
import Badge from "@/components/ui/Badge";
import FormulaireAnnonce from "@/components/admin/FormulaireAnnonce";

export default async function AnnoncesPage() {
  await exigerStaff();
  const supabase = await createClient();

  const { data: plans } = await supabase
    .from("plans")
    .select("id, nom")
    .order("prix", { ascending: true });

  // Historique : on regroupe les notifications diffusées (categorie
  // "annonce") par (titre, message, date) pour retrouver chaque envoi.
  const { data: recentes } = await supabase
    .from("notifications")
    .select("titre, message, categorie, created_at")
    .eq("categorie", "annonce")
    .order("created_at", { ascending: false })
    .limit(300);

  const groupes = new Map<
    string,
    { titre: string; message: string; created_at: string; nb: number }
  >();
  (recentes ?? []).forEach((n) => {
    const cle = `${n.titre}|${n.message}|${n.created_at.slice(0, 16)}`;
    const g = groupes.get(cle) ?? {
      titre: n.titre,
      message: n.message,
      created_at: n.created_at,
      nb: 0,
    };
    g.nb += 1;
    groupes.set(cle, g);
  });
  const historique = Array.from(groupes.values()).slice(0, 20);

  return (
    <div className="font-[family-name:var(--font-jakarta)]">
      <div className="mb-8">
        <h1 className="flex items-center gap-2 text-[32px] font-bold tracking-tight text-dash-dark">
          <Megaphone size={26} strokeWidth={1.75} />
          Annonces
        </h1>
        <p className="mt-1 text-sm text-dash-text-secondary">
          Diffuser un message à tous les propriétaires ou à un groupe filtré par
          plan.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        <FormulaireAnnonce plans={plans ?? []} />

        <div>
          <h2 className="mb-3 text-sm font-semibold text-dash-dark">
            Dernières annonces
          </h2>
          {historique.length === 0 ? (
            <EmptyState
              icon={Megaphone}
              title="Aucune annonce"
              description="Les annonces diffusées apparaîtront ici."
            />
          ) : (
            <ul className="space-y-3">
              {historique.map((h, i) => (
                <li
                  key={i}
                  className="rounded-xl border border-dash-border bg-white p-4 shadow-[0px_4px_10px_rgba(43,76,91,0.05)]"
                >
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-dash-text">{h.titre}</p>
                    <Badge variant="neutral">{h.nb} dest.</Badge>
                  </div>
                  <p className="line-clamp-3 text-xs text-dash-text-secondary">
                    {h.message}
                  </p>
                  <p className="mt-2 text-xs text-dash-text-secondary">
                    {new Date(h.created_at).toLocaleString("fr-FR", {
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
