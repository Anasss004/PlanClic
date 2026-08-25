import Header from "@/components/Header";
import SearchHero from "@/components/SearchHero";
import PromoBanner from "@/components/PromoBanner";
import PopularAgencies from "@/components/PopularAgencies";
import CitiesGrid from "@/components/CitiesGrid";
import OwnerBanner from "@/components/OwnerBanner";
import Footer from "@/components/Footer";

export default function HomePage() {
  return (
    <>
      <Header />

      <main className="mx-auto w-full max-w-[1280px] flex-1 px-6">
        <SearchHero />
        <PromoBanner />
        <PopularAgencies />
      </main>

      <CitiesGrid />
      <OwnerBanner />
      <Footer />
    </>
  );
}
