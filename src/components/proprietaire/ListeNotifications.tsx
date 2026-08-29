"use client";

import { useTransition } from "react";
import { Check, CheckCheck } from "lucide-react";
import {
  marquerNotificationLue,
  marquerToutesLues,
} from "@/app/actions/notifications";
import { useToast } from "@/components/ui/Toast";
import Badge from "@/components/ui/Badge";

type Notif = {
  id: string;
  titre: string;
  message: string;
  categorie: string;
  lu_le: string | null;
  created_at: string;
};

const LABEL_CAT: Record<string, string> = {
  annonce: "Annonce",
  support: "Support",
  systeme: "Système",
};

export default function ListeNotifications({
  notifications,
  lectureSeule,
}: {
  notifications: Notif[];
  lectureSeule: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const toast = useToast();
  const nbNonLues = notifications.filter((n) => !n.lu_le).length;

  function lire(id: string) {
    startTransition(async () => {
      try {
        await marquerNotificationLue(id);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Erreur.");
      }
    });
  }

  function toutLire() {
    startTransition(async () => {
      try {
        await marquerToutesLues();
        toast.success("Tout marqué comme lu.");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Erreur.");
      }
    });
  }

  return (
    <div>
      {!lectureSeule && nbNonLues > 0 && (
        <button
          onClick={toutLire}
          disabled={isPending}
          className="mb-4 flex items-center gap-1.5 rounded-lg border border-dash-border px-4 py-2 text-sm font-medium text-dash-text-secondary hover:bg-gray-50 disabled:opacity-50"
        >
          <CheckCheck size={14} />
          Tout marquer comme lu
        </button>
      )}

      <ul className="space-y-3">
        {notifications.map((n) => (
          <li
            key={n.id}
            className={`rounded-xl border p-4 shadow-[0px_4px_10px_rgba(43,76,91,0.05)] ${
              n.lu_le
                ? "border-dash-border bg-white"
                : "border-dash-accent/40 bg-[#fffaf0]"
            }`}
          >
            <div className="mb-1 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-dash-text">{n.titre}</p>
                <Badge variant={n.categorie === "support" ? "info" : "neutral"}>
                  {LABEL_CAT[n.categorie] ?? n.categorie}
                </Badge>
              </div>
              {!n.lu_le && !lectureSeule && (
                <button
                  onClick={() => lire(n.id)}
                  disabled={isPending}
                  className="flex shrink-0 items-center gap-1 text-xs font-medium text-dash-text-secondary hover:text-dash-dark disabled:opacity-50"
                >
                  <Check size={13} />
                  Marquer lu
                </button>
              )}
            </div>
            <p className="whitespace-pre-wrap text-sm text-dash-text-secondary">
              {n.message}
            </p>
            <p className="mt-2 text-xs text-dash-text-secondary">
              {new Date(n.created_at).toLocaleString("fr-FR", {
                day: "2-digit",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
