import { Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import EmptyState from "@/components/ui/EmptyState";
import Badge from "@/components/ui/Badge";

export default async function UtilisateursPage() {
  const supabase = await createClient();

  const { data: utilisateurs } = await supabase
    .from("profiles")
    .select("id, prenom, nom, email, telephone, role, created_at")
    .order("created_at", { ascending: false });

  return (
    <div className="font-[family-name:var(--font-jakarta)]">
      <div className="mb-8">
        <h1 className="text-[32px] font-bold tracking-tight text-dash-dark">
          Utilisateurs
        </h1>
        <p className="mt-1 text-sm text-dash-text-secondary">
          {utilisateurs?.length ?? 0} compte(s) au total.
        </p>
      </div>

      {!utilisateurs || utilisateurs.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Aucun utilisateur"
          description="Les comptes créés sur la plateforme apparaîtront ici."
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-dash-border bg-white shadow-[0px_4px_10px_rgba(43,76,91,0.05)]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-dash-border bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-dash-text-secondary">
                <th className="px-5 py-3">Nom</th>
                <th className="px-5 py-3">Email</th>
                <th className="px-5 py-3">Téléphone</th>
                <th className="px-5 py-3">Rôle</th>
              </tr>
            </thead>
            <tbody>
              {utilisateurs.map((u) => (
                <tr key={u.id} className="border-b border-dash-border last:border-0">
                  <td className="px-5 py-3 font-medium text-dash-text">
                    {u.prenom} {u.nom}
                  </td>
                  <td className="px-5 py-3 text-dash-text-secondary">{u.email}</td>
                  <td className="px-5 py-3 text-dash-text-secondary">{u.telephone ?? "—"}</td>
                  <td className="px-5 py-3">
                    <Badge
                      variant={
                        u.role === "admin" || u.role === "support"
                          ? "brand"
                          : u.role === "proprietaire"
                          ? "info"
                          : "neutral"
                      }
                    >
                      {u.role}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
