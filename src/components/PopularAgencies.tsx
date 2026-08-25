import Link from "next/link";
import { Star } from "lucide-react";
import Reveal from "@/components/motion/Reveal";

const AGENCES = [
  { nom: "Europcar", note: "4.7", couleur: "bg-[#e6f4e6]" },
  { nom: "Sixt", note: "4.6", couleur: "bg-[#ff5c39]" },
  { nom: "Luxury World Cars", note: "4.4", couleur: "bg-black" },
  { nom: "Location Moto Marrakech", note: "4.0", couleur: "bg-[#474747]" },
];

export default function PopularAgencies() {
  return (
    <section className="mt-12">
      <Reveal>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-black">
            Les agences les plus populaires
          </h2>
          <Link
            href="/agences"
            className="nav-underline text-sm text-black transition-colors hover:text-brand-dark"
          >
            Tout afficher
          </Link>
        </div>
      </Reveal>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {AGENCES.map((agence, i) => (
          <Reveal key={agence.nom} delay={i * 80}>
            <div className="group overflow-hidden rounded-2xl border border-black/5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
              <div
                className={`flex h-[120px] items-center justify-center overflow-hidden ${agence.couleur} text-white`}
              >
                <span className="transition-transform duration-500 ease-out group-hover:scale-110">
                  {agence.nom}
                </span>
              </div>
              <div className="p-3">
                <p className="text-sm font-bold text-brand-dark">
                  {agence.nom}
                </p>
                <p className="flex items-center gap-1 text-sm text-brand-dark">
                  <Star size={13} strokeWidth={0} className="fill-amber-400 text-amber-400" />
                  {agence.note}
                </p>
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
