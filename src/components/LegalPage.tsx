import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function LegalPage({
  titre,
  children,
}: {
  titre: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
        <h1 className="mb-2 font-[family-name:var(--font-bagel)] text-3xl text-brand-dark">
          {titre}
        </h1>
        <p className="mb-8 text-xs text-gray-400">Dernière mise à jour : à compléter</p>
        <div className="prose prose-sm max-w-none space-y-4 text-sm leading-relaxed text-gray-700 [&_h2]:mt-8 [&_h2]:mb-2 [&_h2]:text-base [&_h2]:font-bold [&_h2]:text-brand-dark [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1">
          {children}
        </div>
      </main>
      <Footer />
    </>
  );
}
