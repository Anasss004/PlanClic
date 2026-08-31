import "server-only";

import { PDFDocument, StandardFonts, rgb, type PDFFont } from "pdf-lib";
import { formaterDate, formaterHeure, nombreDeJours } from "@/lib/dates";

// ============================================================
// Génération du contrat de location (V1, sans signature électronique).
//
// Choix de pdf-lib plutôt que @react-pdf/renderer :
//   * pur JavaScript, aucune dépendance native / WASM à configurer
//     dans le runtime serveur Next ;
//   * installation légère ;
//   * le template ici (en-tête, lignes clé/valeur, grille de photos,
//     mention légale) est simple et ne demande pas de moteur de
//     layout type flexbox.
//
// Limite connue : les polices standard (Helvetica) utilisent l'encodage
// WinAnsi. Les caractères hors de cet encodage (→, tirets longs, œ…)
// sont remplacés par `nettoyerTexte()` avant d'être dessinés.
// ============================================================

const A4 = { largeur: 595.28, hauteur: 841.89 };
const MARGE = 50;
const COULEUR_TITRE = rgb(0.082, 0.322, 0.388); // #155263 (brand-dark)
const COULEUR_TEXTE = rgb(0.1, 0.11, 0.11);
const COULEUR_GRIS = rgb(0.46, 0.46, 0.46);

export type DonneesContrat = {
  reservationId: string;
  client: { nom: string; telephone: string | null; cin: string | null };
  vehicule: { marque: string; modele: string; immatriculation: string };
  dateDebut: string;
  dateFin: string;
  heureDebut?: string | null;
  lieuDebut?: string | null;
  heureFin?: string | null;
  lieuFin?: string | null;
  prixTotal: number | null;
  photos: { bytes: Uint8Array; type: "image/jpeg" | "image/png" }[];
  genereLe: Date;
};

function nettoyerTexte(t: string): string {
  return (t ?? "")
    .replace(/→|➔/g, "-")
    .replace(/[‘’‛]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/…/g, "...")
    .replace(/œ/g, "oe")
    .replace(/Œ/g, "OE")
    .replace(/ /g, " ")
    // tout ce qui reste hors Latin-1 imprimable -> "?"
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, "?");
}

function couperEnLignes(
  texte: string,
  font: PDFFont,
  taille: number,
  largeurMax: number
): string[] {
  const mots = nettoyerTexte(texte).split(/\s+/);
  const lignes: string[] = [];
  let courante = "";
  for (const mot of mots) {
    const essai = courante ? `${courante} ${mot}` : mot;
    if (font.widthOfTextAtSize(essai, taille) > largeurMax && courante) {
      lignes.push(courante);
      courante = mot;
    } else {
      courante = essai;
    }
  }
  if (courante) lignes.push(courante);
  return lignes;
}

export async function construireContratPdf(
  d: DonneesContrat
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(`Contrat de location - ${d.vehicule.marque} ${d.vehicule.modele}`);
  doc.setProducer("PlanClic");

  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

  let page = doc.addPage([A4.largeur, A4.hauteur]);
  const largeurUtile = A4.largeur - MARGE * 2;
  let y = A4.hauteur - MARGE;

  const nouvellePageSiBesoin = (hauteurNecessaire: number) => {
    if (y - hauteurNecessaire < MARGE) {
      page = doc.addPage([A4.largeur, A4.hauteur]);
      y = A4.hauteur - MARGE;
    }
  };

  const texte = (
    t: string,
    opts: { size?: number; bold?: boolean; color?: ReturnType<typeof rgb>; x?: number } = {}
  ) => {
    const size = opts.size ?? 10;
    page.drawText(nettoyerTexte(t), {
      x: opts.x ?? MARGE,
      y,
      size,
      font: opts.bold ? fontBold : font,
      color: opts.color ?? COULEUR_TEXTE,
    });
  };

  // ---- En-tête PlanClic
  texte("PlanClic", { size: 22, bold: true, color: COULEUR_TITRE });
  y -= 18;
  texte("Contrat de location de vehicule", { size: 12, color: COULEUR_GRIS });
  y -= 10;
  page.drawLine({
    start: { x: MARGE, y },
    end: { x: A4.largeur - MARGE, y },
    thickness: 1,
    color: rgb(0.9, 0.89, 0.87),
  });
  y -= 28;

  // ---- Bloc d'une section clé/valeur
  const section = (titre: string, lignes: [string, string][]) => {
    nouvellePageSiBesoin(24 + lignes.length * 16 + 12);
    texte(titre.toUpperCase(), { size: 9, bold: true, color: COULEUR_GRIS });
    y -= 16;
    for (const [cle, valeur] of lignes) {
      texte(cle, { size: 10, bold: true });
      page.drawText(nettoyerTexte(valeur || "-"), {
        x: MARGE + 150,
        y,
        size: 10,
        font,
        color: COULEUR_TEXTE,
      });
      y -= 16;
    }
    y -= 12;
  };

  section("Locataire", [
    ["Nom", d.client.nom],
    ["Telephone", d.client.telephone || "Non communique"],
    ["CIN / Passeport", d.client.cin || "Non communique"],
  ]);

  section("Vehicule", [
    ["Marque / Modele", `${d.vehicule.marque} ${d.vehicule.modele}`],
    ["Immatriculation", d.vehicule.immatriculation],
  ]);

  const jours = nombreDeJours(d.dateDebut, d.dateFin);
  const avecHeure = (dateIso: string, heure?: string | null) =>
    heure ? `${formaterDate(dateIso)} a ${formaterHeure(heure)}` : formaterDate(dateIso);

  section("Location", [
    ["Prise en charge", avecHeure(d.dateDebut, d.heureDebut)],
    ...(d.lieuDebut ? ([["Lieu de depart", d.lieuDebut]] as [string, string][]) : []),
    ["Restitution", avecHeure(d.dateFin, d.heureFin)],
    ...(d.lieuFin ? ([["Lieu de retour", d.lieuFin]] as [string, string][]) : []),
    ["Duree", `${jours} jour${jours > 1 ? "s" : ""}`],
    [
      "Prix total",
      d.prixTotal != null
        ? `${d.prixTotal.toLocaleString("fr-FR")} MAD`
        : "A convenir",
    ],
  ]);

  // ---- État des lieux (photos)
  if (d.photos.length > 0) {
    nouvellePageSiBesoin(30);
    texte("ETAT DES LIEUX", { size: 9, bold: true, color: COULEUR_GRIS });
    y -= 20;

    const colonnes = 2;
    const espace = 14;
    const largeurCase = (largeurUtile - espace * (colonnes - 1)) / colonnes;
    const hauteurCase = largeurCase * 0.7;

    for (let i = 0; i < d.photos.length; i += colonnes) {
      nouvellePageSiBesoin(hauteurCase + 14);
      const rangee = d.photos.slice(i, i + colonnes);
      for (let j = 0; j < rangee.length; j++) {
        const p = rangee[j];
        try {
          const img =
            p.type === "image/png"
              ? await doc.embedPng(p.bytes)
              : await doc.embedJpg(p.bytes);
          const ratio = Math.min(
            largeurCase / img.width,
            hauteurCase / img.height
          );
          const w = img.width * ratio;
          const h = img.height * ratio;
          const x = MARGE + j * (largeurCase + espace);
          page.drawImage(img, { x, y: y - h, width: w, height: h });
        } catch {
          // photo illisible : on l'ignore, le contrat reste généré
        }
      }
      y -= hauteurCase + 14;
    }
    y -= 8;
  }

  // ---- Mention légale
  const mention =
    "Le locataire reconnait avoir recu le vehicule decrit ci-dessus dans l'etat " +
    "constate sur les photos jointes et s'engage a le restituer dans le meme etat, " +
    "a la date convenue. Le locataire est responsable du vehicule pendant toute la " +
    "duree de la location, y compris des amendes, contraventions et dommages survenus " +
    "durant cette periode. Tout retard de restitution pourra donner lieu a une " +
    "facturation supplementaire. Ce document est etabli entre les parties ; la " +
    "signature manuscrite de chacune vaut acceptation.";

  nouvellePageSiBesoin(20 + couperEnLignes(mention, font, 9, largeurUtile).length * 12 + 60);
  texte("RESPONSABILITE", { size: 9, bold: true, color: COULEUR_GRIS });
  y -= 16;
  for (const ligne of couperEnLignes(mention, font, 9, largeurUtile)) {
    page.drawText(ligne, { x: MARGE, y, size: 9, font, color: COULEUR_TEXTE });
    y -= 12;
  }
  y -= 30;

  // ---- Signatures (physiques)
  nouvellePageSiBesoin(60);
  texte("Signature du proprietaire", { size: 9, color: COULEUR_GRIS });
  page.drawText("Signature du locataire", {
    x: MARGE + largeurUtile / 2,
    y,
    size: 9,
    font,
    color: COULEUR_GRIS,
  });
  y -= 40;
  page.drawLine({
    start: { x: MARGE, y },
    end: { x: MARGE + largeurUtile / 2 - 30, y },
    thickness: 0.5,
    color: COULEUR_GRIS,
  });
  page.drawLine({
    start: { x: MARGE + largeurUtile / 2, y },
    end: { x: A4.largeur - MARGE, y },
    thickness: 0.5,
    color: COULEUR_GRIS,
  });

  // ---- Pied de page sur chaque page
  const pages = doc.getPages();
  pages.forEach((p, i) => {
    p.drawText(
      nettoyerTexte(
        `Document genere via PlanClic le ${d.genereLe.toLocaleDateString("fr-FR")} - page ${i + 1}/${pages.length}`
      ),
      { x: MARGE, y: 28, size: 8, font, color: COULEUR_GRIS }
    );
  });

  return doc.save();
}
