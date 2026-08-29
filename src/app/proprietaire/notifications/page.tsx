import { Bell } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { resoudreProprietaireId } from "@/lib/impersonation";
import EmptyState from "@/components/ui/EmptyState";
import ListeNotifications from "@/components/proprietaire/ListeNotifications";

export default async function NotificationsProprietairePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { id: pid, impersonation } = await resoudreProprietaireId(user!.id);

  const { data: notifications } = await supabase
    .from("notifications")
    .select("id, titre, message, categorie, lu_le, created_at")
    .eq("destinataire_id", pid)
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div className="font-[family-name:var(--font-jakarta)]">
      <div className="mb-8">
        <h1 className="flex items-center gap-2 text-[32px] font-bold tracking-tight text-dash-dark">
          <Bell size={26} strokeWidth={1.75} />
          Notifications
        </h1>
        <p className="mt-1 text-sm text-dash-text-secondary">
          Annonces et messages de l&apos;équipe PlanClic.
        </p>
      </div>

      {!notifications || notifications.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="Aucune notification"
          description="Les annonces et messages de l'équipe PlanClic apparaîtront ici."
        />
      ) : (
        <ListeNotifications
          notifications={notifications}
          lectureSeule={Boolean(impersonation)}
        />
      )}
    </div>
  );
}
