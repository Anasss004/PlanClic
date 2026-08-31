"use client";

import { useState, useTransition } from "react";
import { Star, Trash2 } from "lucide-react";
import {
  supprimerPhotoVehicule,
  definirPhotoCouverture,
} from "@/app/actions/proprietaire";
import { useToast } from "@/components/ui/Toast";
import { useConfirm } from "@/components/ui/ConfirmDialog";

export default function GestionPhotosVehicule({
  vehiculeId,
  photos,
}: {
  vehiculeId: string;
  photos: string[];
}) {
  const [liste, setListe] = useState(photos);
  const [isPending, startTransition] = useTransition();
  const toast = useToast();
  const confirmer = useConfirm();

  if (liste.length === 0) {
    return <p className="mb-2 text-xs text-[#6a6a6a]">Aucune photo pour l&apos;instant.</p>;
  }

  function mettreEnCouverture(url: string) {
    setListe((l) => [url, ...l.filter((p) => p !== url)]);
    startTransition(async () => {
      try {
        await definirPhotoCouverture(vehiculeId, url);
        toast.success("Photo de couverture mise à jour.");
      } catch (e) {
        setListe(photos);
        toast.error(e instanceof Error ? e.message : "Erreur.");
      }
    });
  }

  async function supprimer(url: string) {
    const ok = await confirmer({
      titre: "Supprimer cette photo ?",
      labelConfirmer: "Supprimer",
      danger: true,
    });
    if (!ok) return;
    setListe((l) => l.filter((p) => p !== url));
    startTransition(async () => {
      try {
        await supprimerPhotoVehicule(vehiculeId, url);
        toast.success("Photo supprimée.");
      } catch (e) {
        setListe(photos);
        toast.error(e instanceof Error ? e.message : "Erreur.");
      }
    });
  }

  return (
    <div className="mb-3 flex flex-wrap gap-3">
      {liste.map((url, i) => (
        <div
          key={url}
          className={`group relative h-24 w-32 overflow-hidden rounded-lg border-2 ${
            i === 0 ? "border-dash-accent" : "border-transparent"
          } bg-gray-100`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt="" className="h-full w-full object-cover" />

          {i === 0 && (
            <span className="absolute left-1 top-1 flex items-center gap-1 rounded bg-dash-accent px-1.5 py-0.5 text-[10px] font-bold text-dash-text">
              <Star size={9} strokeWidth={3} /> Couverture
            </span>
          )}

          <div className="absolute inset-0 flex items-end justify-between gap-1 bg-gradient-to-t from-black/60 to-transparent p-1.5 opacity-0 transition group-hover:opacity-100">
            {i !== 0 ? (
              <button
                type="button"
                disabled={isPending}
                onClick={() => mettreEnCouverture(url)}
                title="Mettre en couverture"
                className="rounded bg-white/90 p-1 text-dash-dark hover:bg-white disabled:opacity-50"
              >
                <Star size={13} strokeWidth={2} />
              </button>
            ) : (
              <span />
            )}
            <button
              type="button"
              disabled={isPending}
              onClick={() => supprimer(url)}
              title="Supprimer"
              className="rounded bg-white/90 p-1 text-rose-600 hover:bg-white disabled:opacity-50"
            >
              <Trash2 size={13} strokeWidth={2} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
