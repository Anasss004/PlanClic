import { redirect } from "next/navigation";
import { KeyRound } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import SelecteurRole from "@/components/admin/SelecteurRole";

export default async function RolesPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: monProfil } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user!.id)
    .single();

  // Réservé aux vrais admin — le support peut valider des comptes/
  // documents mais jamais changer un rôle.
  if (monProfil?.role !== "admin") {
    redirect("/admin/dashboard");
  }

  const { data: utilisateurs } = await supabase
    .from("profiles")
    .select("id, prenom, nom, email, role")
    .order("created_at", { ascending: false });

  return (
    <div>
      <div className="mb-8">
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-gray-900">
          <KeyRound size={22} strokeWidth={1.75} />
          Gestion des rôles
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Réservé aux administrateurs. Chaque changement est journalisé.
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
        {utilisateurs?.map((u, i) => (
          <div
            key={u.id}
            className={`flex items-center justify-between px-5 py-4 ${
              i !== 0 ? "border-t border-gray-100" : ""
            }`}
          >
            <div>
              <p className="text-sm font-semibold text-gray-900">
                {u.prenom} {u.nom}
              </p>
              <p className="text-xs text-gray-500">{u.email}</p>
            </div>
            <SelecteurRole userId={u.id} roleActuel={u.role} />
          </div>
        ))}
      </div>
    </div>
  );
}
