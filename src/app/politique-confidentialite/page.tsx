import LegalPage from "@/components/LegalPage";

export default function PolitiqueConfidentialitePage() {
  return (
    <LegalPage titre="Politique de Confidentialité">
      <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
        ⚠️ Modèle à personnaliser et à faire valider par un juriste avant
        publication, en cohérence avec ta déclaration/autorisation CNDP.
      </p>

      <h2>Données collectées</h2>
      <p>Selon ton profil (client ou propriétaire), PlanClic peut collecter :</p>
      <ul>
        <li>Nom, prénom, genre, date de naissance</li>
        <li>Téléphone et adresse email</li>
        <li>
          Pour les propriétaires : informations de l&apos;agence, Registre de
          Commerce, pièce d&apos;identité du gérant
        </li>
        <li>
          Pour les locations : carte d&apos;identité nationale (CIN) et permis
          de conduire, uniquement lorsqu&apos;une réservation est en cours
        </li>
      </ul>

      <h2>Finalité du traitement</h2>
      <p>
        Ces données sont utilisées pour créer et vérifier les comptes, mettre
        en relation propriétaires et locataires, générer les contrats de
        location, et assurer la sécurité de la plateforme.
      </p>

      <h2>Conservation des données</h2>
      <p>
        Les données sont conservées pendant la durée nécessaire aux finalités
        ci-dessus, et selon les durées légales applicables (notamment pour les
        documents contractuels).
      </p>

      <h2>Vos droits</h2>
      <p>
        Conformément à la loi 09-08 relative à la protection des personnes
        physiques à l&apos;égard du traitement des données à caractère
        personnel, tu disposes d&apos;un droit d&apos;accès, de rectification
        et d&apos;opposition sur tes données. Pour l&apos;exercer, contacte-nous
        à [email de contact].
      </p>

      <h2>Sécurité</h2>
      <p>
        PlanClic met en œuvre des mesures techniques (accès restreint,
        chiffrement, stockage sécurisé) pour protéger tes données contre tout
        accès non autorisé.
      </p>
    </LegalPage>
  );
}
