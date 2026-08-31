"use client";

import { useEffect, useRef, useState } from "react";
import { MessageCircle, Phone, ChevronDown } from "lucide-react";
import { construireLienWhatsApp } from "@/lib/whatsapp";
import { formaterPeriode, formaterHeure } from "@/lib/dates";

export type InfosContact = {
  nom: string;
  telephone: string | null;
  vehicule: string;
  dateDebut: string;
  dateFin: string;
  heureDebut?: string | null;
  lieuDebut?: string | null;
  statut: string;
};

function modeles(i: InfosContact): { cle: string; label: string; texte: string }[] {
  const periode = formaterPeriode(i.dateDebut, i.dateFin);
  const rdv = [
    i.lieuDebut ? `au lieu suivant : ${i.lieuDebut}` : null,
    i.heureDebut ? `à ${formaterHeure(i.heureDebut)}` : null,
  ]
    .filter(Boolean)
    .join(" ");

  return [
    {
      cle: "cin",
      label: "Demander CIN / passeport",
      texte: `Bonjour ${i.nom}, pour finaliser votre location ${i.vehicule} (${periode}), pouvez-vous m'envoyer une photo de votre CIN ou passeport ? Merci !`,
    },
    {
      cle: "rdv",
      label: "Confirmer le rendez-vous",
      texte: `Bonjour ${i.nom}, je vous confirme la prise en charge de ${i.vehicule} ${periode}${rdv ? ` ${rdv}` : ""}. À bientôt !`,
    },
    {
      cle: "relance",
      label: "Relancer",
      texte: `Bonjour ${i.nom}, je reviens vers vous au sujet de votre demande de location ${i.vehicule} (${periode}). Est-elle toujours d'actualité ?`,
    },
    {
      cle: "pret",
      label: "Véhicule prêt",
      texte: `Bonjour ${i.nom}, votre ${i.vehicule} est prêt${i.lieuDebut ? ` (${i.lieuDebut})` : ""}. Vous pouvez venir le récupérer${i.heureDebut ? ` à partir de ${formaterHeure(i.heureDebut)}` : ""}. À tout de suite !`,
    },
  ];
}

export default function ContactClient({ infos }: { infos: InfosContact }) {
  const [ouvert, setOuvert] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function ext(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOuvert(false);
    }
    document.addEventListener("mousedown", ext);
    return () => document.removeEventListener("mousedown", ext);
  }, []);

  if (!infos.telephone) return null;
  const tel = infos.telephone;

  return (
    <div className="mb-3 flex gap-2">
      <a
        href={`tel:${tel.replace(/\s/g, "")}`}
        className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-dash-border py-2.5 text-sm font-semibold text-dash-text-secondary transition hover:bg-gray-50"
      >
        <Phone size={15} strokeWidth={2} />
        Appeler
      </a>

      <div className="relative flex-1" ref={ref}>
        <button
          type="button"
          onClick={() => setOuvert((v) => !v)}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-emerald-600 py-2.5 text-sm font-semibold text-white shadow transition hover:bg-emerald-700"
        >
          <MessageCircle size={15} strokeWidth={2} />
          WhatsApp
          <ChevronDown size={13} strokeWidth={2.5} className={ouvert ? "rotate-180" : ""} />
        </button>

        {ouvert && (
          <div className="absolute right-0 z-20 mt-1 w-64 overflow-hidden rounded-xl border border-dash-border bg-white py-1 shadow-lg">
            {modeles(infos).map((m) => (
              <a
                key={m.cle}
                href={construireLienWhatsApp(tel, m.texte)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setOuvert(false)}
                className="block px-3 py-2 text-left text-sm text-dash-text hover:bg-gray-50"
              >
                {m.label}
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
