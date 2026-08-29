import "server-only";

// Signatures binaires réelles (magic bytes) — on ne fait jamais
// confiance à `file.type` ou à l'extension du nom de fichier, qui
// viennent du navigateur et sont trivialement falsifiables.
const SIGNATURES: { mime: string; bytes: number[] }[] = [
  { mime: "image/jpeg", bytes: [0xff, 0xd8, 0xff] },
  { mime: "image/png", bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  { mime: "application/pdf", bytes: [0x25, 0x50, 0x44, 0x46] },
];

const TAILLE_MAX_OCTETS = 10 * 1024 * 1024; // 10 Mo

export type ResultatValidation = { valide: true } | { valide: false; raison: string };

// Vérifie qu'un fichier envoyé au serveur correspond réellement à un
// type autorisé, en lisant sa signature binaire — pas son nom ni son
// type MIME déclaré côté client.
export async function validerFichier(
  fichier: File,
  typesAutorises: ("image/jpeg" | "image/png" | "application/pdf")[]
): Promise<ResultatValidation> {
  if (!fichier || fichier.size === 0) {
    return { valide: false, raison: "Fichier manquant." };
  }
  if (fichier.size > TAILLE_MAX_OCTETS) {
    return { valide: false, raison: "Fichier trop volumineux (10 Mo maximum)." };
  }

  const buffer = new Uint8Array(await fichier.slice(0, 8).arrayBuffer());
  const signatureDetectee = SIGNATURES.find(
    (s) => s.bytes.every((b, i) => buffer[i] === b) && typesAutorises.includes(s.mime as any)
  );

  if (!signatureDetectee) {
    return {
      valide: false,
      raison: "Type de fichier non autorisé (JPEG, PNG ou PDF uniquement).",
    };
  }

  return { valide: true };
}
