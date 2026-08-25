import type { Metadata } from "next";
import { Inter, Bagel_Fat_One } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const bagelFatOne = Bagel_Fat_One({
  variable: "--font-bagel",
  weight: "400",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PlanClic — Planifier en un Clic",
  description:
    "Louez une voiture, moto ou utilitaire auprès d'agences vérifiées partout au Maroc.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="fr"
      className={`${inter.variable} ${bagelFatOne.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
