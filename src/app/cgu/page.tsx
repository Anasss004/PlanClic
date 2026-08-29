import LegalPage from "@/components/LegalPage";

export default function CGUPage() {
  return (
    <LegalPage titre="Conditions Générales d'Utilisation">
      <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
        ⚠️ Modèle à personnaliser et à faire valider par un juriste avant
        publication.
      </p>

      <h2>Objet</h2>
      <p>
        PlanClic est une plateforme de mise en relation entre des
        propriétaires de véhicules (voitures, motos, utilitaires) et des
        personnes souhaitant louer un véhicule au Maroc.
      </p>

      <h2>Inscription</h2>
      <p>
        L&apos;inscription en tant que client se fait par email/téléphone.
        L&apos;inscription en tant que propriétaire nécessite une vérification
        manuelle des documents (Registre de Commerce, pièce d&apos;identité)
        par l&apos;équipe PlanClic avant activation du compte.
      </p>

      <h2>Réservations</h2>
      <p>
        Toute demande de réservation envoyée par un client doit être
        acceptée par le propriétaire avant confirmation. PlanClic
        n&apos;intervient pas dans la décision d&apos;acceptation ou de refus.
      </p>

      <h2>Responsabilités</h2>
      <p>
        Le propriétaire est seul responsable de l&apos;état, de
        l&apos;assurance et de la conformité légale de son véhicule. Le
        locataire s&apos;engage à respecter les conditions du contrat de
        location signé avec le propriétaire.
      </p>

      <h2>Compte et sécurité</h2>
      <p>
        Chaque utilisateur est responsable de la confidentialité de ses
        identifiants de connexion. Toute activité suspecte doit être signalée
        immédiatement à PlanClic.
      </p>

      <h2>Modification des CGU</h2>
      <p>
        PlanClic se réserve le droit de modifier les présentes conditions à
        tout moment. Les utilisateurs seront informés des changements
        significatifs.
      </p>
    </LegalPage>
  );
}
