"use client";

import { useTransition } from "react";
import Link from "next/link";
import {
  Bell,
  Check,
  CheckCheck,
  ClipboardList,
  FileWarning,
  ShieldCheck,
  Megaphone,
} from "lucide-react";
import {
  marquerNotificationLue,
  marquerToutesLues,
} from "@/app/actions/notifications";
import { useToast } from "@/components/ui/Toast";
import { formaterRelatif } from "@/lib/dates";

export type ElementFlux = {
  id: string;
  type: "annonce" | "support" | "systeme" | "demande" | "document" | "verification";
  titre: string;
  message: string;
  date: string;
  href?: string;
  // true/false pour une notification stockée, null pour un élément dérivé
  lu: boolean | null;
};

const ICONES = {
  annonce: Megaphone,
  support: Bell,
  systeme: Bell,
  demande: ClipboardList,
  document: FileWarning,
  verification: ShieldCheck,
} as const;

export default function FluxNotifications({
  elements,
  lectureSeule,
}: {
  elements: ElementFlux[];
  lectureSeule: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const toast = useToast();
  const nbNonLues = elements.filter((e) => e.lu === false).length;

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
        {elements.map((e) => {
          const Icone = ICONES[e.type] ?? Bell;
          const nonLu = e.lu === false;
          const contenu = (
            <div
              className={`flex gap-3 rounded-xl border p-4 shadow-[0px_4px_10px_rgba(43,76,91,0.05)] transition ${
                nonLu ? "border-dash-accent/40 bg-[#fffaf0]" : "border-dash-border bg-white"
              } ${e.href ? "hover:border-dash-dark/30" : ""}`}
            >
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-dash-accent/15">
                <Icone size={15} strokeWidth={1.75} className="text-dash-dark" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-dash-text">{e.titre}</p>
                  {e.lu === false && !lectureSeule && (
                    <button
                      onClick={(ev) => {
                        ev.preventDefault();
                        lire(e.id);
                      }}
                      disabled={isPending}
                      className="flex shrink-0 items-center gap-1 text-xs font-medium text-dash-text-secondary hover:text-dash-dark"
                    >
                      <Check size={12} /> Lu
                    </button>
                  )}
                </div>
                <p className="mt-0.5 whitespace-pre-wrap text-sm text-dash-text-secondary">
                  {e.message}
                </p>
                <p className="mt-1.5 text-xs text-dash-text-secondary">
                  {formaterRelatif(e.date)}
                </p>
              </div>
            </div>
          );

          return (
            <li key={`${e.type}-${e.id}`}>
              {e.href ? (
                <Link href={e.href} className="block">
                  {contenu}
                </Link>
              ) : (
                contenu
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
