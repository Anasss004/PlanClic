"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MoreVertical, Pencil, Eye, EyeOff, Eye as EyeOn, Trash2 } from "lucide-react";
import { basculerStatutVehicule, supprimerVehicule } from "@/app/actions/proprietaire";
import { useToast } from "@/components/ui/Toast";
import { useConfirm } from "@/components/ui/ConfirmDialog";

export default function MenuActionsVehicule({
  vehiculeId,
  statut,
}: {
  vehiculeId: string;
  statut: string;
}) {
  const [ouvert, setOuvert] = useState(false);
  const [isPending, startTransition] = useTransition();
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const toast = useToast();
  const confirmer = useConfirm();

  useEffect(() => {
    function fermerSiExterieur(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOuvert(false);
      }
    }
    document.addEventListener("mousedown", fermerSiExterieur);
    return () => document.removeEventListener("mousedown", fermerSiExterieur);
  }, []);

  function voir() {
    router.push(`/proprietaire/vehicules/${vehiculeId}`);
  }

  function modifier() {
    router.push(`/proprietaire/vehicules/${vehiculeId}/modifier`);
  }

  function basculer() {
    setOuvert(false);
    startTransition(async () => {
      try {
        await basculerStatutVehicule(vehiculeId, statut);
        toast.success(statut === "actif" ? "Véhicule désactivé." : "Véhicule réactivé.");
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Erreur.");
      }
    });
  }

  async function supprimer() {
    setOuvert(false);
    const ok = await confirmer({
      titre: "Supprimer ce véhicule ?",
      message:
        "Le véhicule sera retiré de vos annonces. Ses réservations passées restent conservées.",
      labelConfirmer: "Supprimer",
      danger: true,
    });
    if (!ok) return;

    // Délai de grâce : 5 s pour annuler avant l'application définitive.
    toast.undoable(
      "Véhicule supprimé",
      async () => {
        try {
          await supprimerVehicule(vehiculeId);
          router.refresh();
        } catch (e) {
          toast.error(e instanceof Error ? e.message : "Suppression impossible.");
        }
      },
      { onCancel: () => toast.info("Suppression annulée.") }
    );
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOuvert((v) => !v)}
        disabled={isPending}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 disabled:opacity-50"
        aria-label="Actions"
      >
        <MoreVertical size={16} strokeWidth={1.75} />
      </button>

      {ouvert && (
        <div className="absolute right-0 z-10 mt-1 w-44 overflow-hidden rounded-xl border border-gray-100 bg-white py-1 shadow-lg">
          <button
            onClick={voir}
            className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
          >
            <Eye size={15} strokeWidth={1.75} /> Voir
          </button>
          <button
            onClick={modifier}
            className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
          >
            <Pencil size={15} strokeWidth={1.75} /> Modifier
          </button>
          <button
            onClick={basculer}
            className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
          >
            {statut === "actif" ? (
              <>
                <EyeOff size={15} strokeWidth={1.75} /> Désactiver
              </>
            ) : (
              <>
                <EyeOn size={15} strokeWidth={1.75} /> Réactiver
              </>
            )}
          </button>
          <button
            onClick={supprimer}
            className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-rose-600 hover:bg-rose-50"
          >
            <Trash2 size={15} strokeWidth={1.75} /> Supprimer
          </button>
        </div>
      )}
    </div>
  );
}
