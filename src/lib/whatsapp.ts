// Normalise un numéro marocain vers le format international attendu
// par WhatsApp (sans "+", sans espaces) : 06XXXXXXXX -> 212XXXXXXXX
function normaliserTelephone(telephone: string): string {
  const chiffres = telephone.replace(/[^\d+]/g, "");
  if (chiffres.startsWith("+212")) return chiffres.slice(1);
  if (chiffres.startsWith("212")) return chiffres;
  if (chiffres.startsWith("0")) return `212${chiffres.slice(1)}`;
  return chiffres;
}

export function construireLienWhatsApp(telephone: string, message: string): string {
  const numero = normaliserTelephone(telephone);
  return `https://wa.me/${numero}?text=${encodeURIComponent(message)}`;
}

// Numéro WhatsApp officiel de PlanClic pour la vérification temporaire
// des documents d'agence — à configurer avec le vrai numéro via la
// variable d'environnement NEXT_PUBLIC_WHATSAPP_ADMIN.
export function lienWhatsAppAdmin(message: string): string {
  const numero = process.env.NEXT_PUBLIC_WHATSAPP_ADMIN || "212600000000";
  return `https://wa.me/${numero}?text=${encodeURIComponent(message)}`;
}
