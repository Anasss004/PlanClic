import Reveal from "@/components/motion/Reveal";
import { VILLES } from "@/lib/villes";

export default function CitiesGrid() {
  return (
    <section className="mt-12 bg-brand-light/30 py-12">
      <div className="mx-auto max-w-[1280px] px-6">
        <Reveal>
          <h2 className="mb-8 text-center font-[family-name:var(--font-bagel)] text-3xl text-brand-dark">
            Disponible partout au Maroc
          </h2>
        </Reveal>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-6">
          {VILLES.map((ville, i) => (
            <Reveal key={ville.nom} delay={i * 60}>
              <div className="group relative aspect-square overflow-hidden rounded-2xl">
                <div
                  className="absolute inset-0 bg-cover bg-center transition-transform duration-500 ease-out group-hover:scale-110"
                  style={{
                    backgroundImage: `linear-gradient(rgba(0,0,0,0.2), rgba(0,0,0,0.2)), url('${ville.img}')`,
                  }}
                />
                <p className="absolute bottom-3 left-3 text-lg font-bold text-white drop-shadow">
                  {ville.nom}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
