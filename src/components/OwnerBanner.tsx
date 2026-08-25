import Link from "next/link";
import Reveal from "@/components/motion/Reveal";

export default function OwnerBanner() {
  return (
    <section className="mx-auto mt-12 max-w-[1280px] px-6">
      <Reveal>
        <div
          className="relative overflow-hidden rounded-2xl p-8 shadow-[0px_0px_4px_0px_rgba(0,0,0,0.25)] md:p-12"
          style={{
            backgroundImage: "linear-gradient(90deg, #155263 40%, #beced3)",
          }}
        >
          <div className="max-w-lg">
            <p className="mb-3 font-[family-name:var(--font-bagel)] text-2xl text-white">
              Êtes-vous un propriétaire ?
            </p>
            <p className="mb-6 text-white/90">
              Rejoignez la communauté des propriétaires d&apos;agences de
              location sur{" "}
              <span className="font-[family-name:var(--font-bagel)]">
                PlanClic
              </span>{" "}
              et boostez votre visibilité en ligne !
            </p>
            <Link
              href="/inscription"
              className="inline-block rounded-full bg-brand-accent px-6 py-2 text-sm font-semibold text-brand-dark shadow transition-all duration-200 hover:brightness-95 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
            >
              Ajoutez votre agence
            </Link>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
