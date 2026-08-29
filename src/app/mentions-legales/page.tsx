import LegalPage from "@/components/LegalPage";

export default function MentionsLegalesPage() {
  return (
    <LegalPage titre="Mentions Légales">
      <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
        ⚠️ Modèle à personnaliser : remplace les champs entre crochets par les
        informations réelles de ta société, et fais valider le texte final par
        un juriste avant publication.
      </p>

      <h2>Éditeur du site</h2>
      <p>
        Le site PlanClic est édité par [Nom de la société], [forme juridique],
        au capital de [montant] MAD, immatriculée au Registre de Commerce de
        [ville] sous le numéro [numéro RC], dont le siège social est situé à
        [adresse complète].
      </p>
      <ul>
        <li>Numéro d&apos;identification fiscale (IF) : [à compléter]</li>
        <li>Directeur de la publication : [nom et prénom]</li>
        <li>Email de contact : [email]</li>
        <li>Téléphone : [numéro]</li>
      </ul>

      <h2>Hébergement</h2>
      <p>
        Le site est hébergé par [nom de l&apos;hébergeur], [adresse de
        l&apos;hébergeur].
      </p>

      <h2>Propriété intellectuelle</h2>
      <p>
        L&apos;ensemble des contenus présents sur le site PlanClic (textes,
        logo, design, code) est protégé par le droit d&apos;auteur. Toute
        reproduction sans autorisation préalable est interdite.
      </p>

      <h2>Responsabilité</h2>
      <p>
        PlanClic met en relation des propriétaires de véhicules et des
        locataires. PlanClic n&apos;est pas partie au contrat de location
        conclu entre le propriétaire et le locataire, et décline toute
        responsabilité quant à l&apos;exécution de ce contrat.
      </p>
    </LegalPage>
  );
}
