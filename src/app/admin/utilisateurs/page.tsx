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
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
          Utilisateurs
        </h1>
        <p className="mt-1 text-sm text-gray-500">
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
        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs font-medium text-gray-500">
                <th className="px-5 py-3">Nom</th>
                <th className="px-5 py-3">Email</th>
                <th className="px-5 py-3">Téléphone</th>
                <th className="px-5 py-3">Rôle</th>
              </tr>
            </thead>
            <tbody>
              {utilisateurs.map((u) => (
                <tr key={u.id} className="border-b border-gray-50 last:border-0">
                  <td className="px-5 py-3 font-medium text-gray-900">
                    {u.prenom} {u.nom}
                  </td>
                  <td className="px-5 py-3 text-gray-500">{u.email}</td>
                  <td className="px-5 py-3 text-gray-500">{u.telephone ?? "—"}</td>
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
