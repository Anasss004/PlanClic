import Reveal from "@/components/motion/Reveal";

export default function PromoBanner() {
  return (
    <Reveal delay={80}>
      <section className="mt-8 flex flex-col overflow-hidden rounded-2xl md:flex-row">
        <div className="flex flex-1 flex-col justify-center gap-3 bg-brand-accent p-8">
          <p className="font-[family-name:var(--font-bagel)] text-3xl text-brand-dark">
            Découvrez les Meilleures
          </p>
          <p className="text-sm font-extrabold text-brand-dark">
            Agences de location près de vous
          </p>
          <button
            type="button"
            className="mt-2 w-fit rounded-full bg-brand-dark px-6 py-1.5 text-sm font-semibold text-white shadow transition-all duration-200 hover:brightness-125 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-dark/40"
          >
            Voir plus
          </button>
        </div>
        <div className="group min-h-[170px] flex-1 overflow-hidden">
          <div
            className="h-full min-h-[170px] w-full bg-cover bg-center transition-transform duration-500 ease-out group-hover:scale-105"
            style={{
              backgroundImage:
                "linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.4)), url('https://www.figma.com/api/mcp/asset/2d6f32f3-0372-4e2d-a3f5-137ecdad2363.png')",
            }}
          />
        </div>
      </section>
    </Reveal>
  );
}
