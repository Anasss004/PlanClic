# Module "Gestion de location + Contrat" (V1)

V1 sans paiement et sans signature électronique. Étend le flux de
réservation manuelle existant (`source = 'manuel'`) pour en faire un
outil de gestion complet : pièce d'identité, photos d'état des lieux,
prix, et génération d'un contrat PDF.

## 1. Migrations Supabase à exécuter (dans l'ordre)

| Ordre | Fichier | Contenu |
|-------|---------|---------|
| 1 | `supabase/15_gestion_location_contrat.sql` | Colonnes `cin_client_manuel`, `photos_etat_vehicule`, `contrat_url`, `signature_url` (V2, inutilisée) sur `reservations` ; bucket privé `contrats` + policies ; fonctions `SECURITY DEFINER` `creer_location_manuelle`, `ajouter_photos_etat_location`, `enregistrer_contrat_location`. |

À lancer dans **Supabase → SQL Editor**, après `14_admin_panel.sql`.
Idempotent (`add column if not exists`, `on conflict do nothing`,
`drop policy if exists` avant chaque `create policy`).

**Après la migration**, vérifier dans Supabase → Storage que le bucket
`contrats` est bien **privé** (non public).

## 2. Dépendance npm ajoutée

`pdf-lib@^1.17.1` — génération du contrat PDF côté serveur.

Choisi plutôt que `@react-pdf/renderer` : pur JavaScript, aucune
dépendance native ni WASM à configurer dans le runtime serveur de
Next, installation légère. Le template (en-tête, lignes clé/valeur,
grille de photos, mention légale) ne nécessite pas de moteur de layout
type flexbox. Contrepartie : mise en page impérative (coordonnées) et
seules les images JPEG/PNG sont supportées — ce qui correspond
exactement à ce que `validation-fichiers.ts` autorise déjà.

## 3. Ce qui a été construit

- **`/proprietaire/bloquer`** renommé **« Nouvelle location »** (thème
  `dash-*`) : ajout du n° CIN/passeport (optionnel), du prix total
  (optionnel), et d'une zone d'upload multi-photos (`FileUpload`).
  L'entrée de sidebar est renommée.
- **`creerLocationManuelle`** (Server Action) : valide chaque photo par
  signature binaire (`validerFichier`), les upload dans
  `documents-prives`, crée la location via `creer_location_manuelle()`
  (fonction `SECURITY DEFINER` qui revérifie que l'appelant est le
  propriétaire du véhicule), puis génère le contrat.
- **`src/lib/contrat-pdf.ts`** : template du contrat (en-tête PlanClic,
  infos locataire / véhicule / dates / durée / prix, grille des photos
  d'état des lieux, clause de responsabilité, emplacements de signature
  manuscrite, pied de page).
- **Génération / stockage** : PDF uploadé dans le bucket privé
  `contrats` (`{proprietaire_id}/{reservation_id}.pdf`), chemin
  enregistré via `enregistrer_contrat_location()`, action journalisée
  dans `audit_logs` (`location.creation_manuelle`, `contrat.generation`).
- **Page Réservations** : pour chaque location manuelle — « Voir le PDF »
  (URL signée 120 s), « Regénérer », « Envoyer le contrat par
  WhatsApp » (URL signée 7 jours + message pré-rempli via
  `construireLienWhatsApp`, journalisé `contrat.partage_whatsapp`).

## 4. Intégration avec l'existant — vérifiée

| Surface | Résultat |
|---------|----------|
| `/proprietaire/reservations` | Les locations manuelles s'affichent (aucun filtre `source`) + nouveaux contrôles contrat. |
| `/proprietaire/calendrier` | Affichées : filtre `statut in ('confirmee','en_attente')`, une location manuelle est créée en `confirmee`. |
| `/proprietaire/statistiques` | Comptent dans « Réservations totales » et le taux d'utilisation. Comptent dans le **chiffre d'affaires** une fois marquées « terminée » **et si un prix a été saisi** (voir point d'attention). |
| `/admin/dashboard` | CA plateforme inclut ces locations ; volontairement exclues de l'entonnoir de conversion (`source !== 'manuel'`). |

## 5. Limites et points d'attention

- **Signature électronique : hors périmètre V1.** La colonne
  `signature_url` est créée (nullable) mais aucune UI. Le contrat prévoit
  deux emplacements de signature manuscrite.
- **Revenu des locations manuelles.** L'ancienne fonction
  `bloquer_vehicule()` ne renseignait aucun prix ; `creer_location_manuelle()`
  capture désormais `prix_total`. Une location manuelle ne compte dans le
  CA **qu'une fois passée en « terminée »** (bouton « Marquer terminée »),
  cohérent avec les réservations PlanClic. Si le propriétaire ne saisit
  pas de prix, elle reste à 0.
- **`bloquer_vehicule()` conservée.** Le blocage rapide de dates depuis
  la fiche véhicule (`/proprietaire/vehicules/[id]`) continue d'utiliser
  `bloquer_vehicule()` — usage distinct (bloquer sans contrat).
  `creer_location_manuelle()` en est un sur-ensemble ; pas de logique
  applicative dupliquée (une seule Server Action, un seul template PDF).
- **Durée de l'URL signée WhatsApp : 7 jours.** WhatsApp ne permet pas
  de joindre le fichier automatiquement ; on envoie un lien. 7 jours est
  un compromis pour laisser au client le temps d'ouvrir le lien. À
  réduire (24–48 h) si vous voulez une fenêtre plus stricte —
  paramètre unique dans `obtenirLienContratWhatsApp`.
- **Nom du client : un seul champ.** `reservations.nom_client_manuel`
  est une colonne unique ; le formulaire demande « Nom complet ». Aucune
  colonne `prenom` ajoutée (le contrat affiche le nom complet).
- **Photos stockées dans `reservations.photos_etat_vehicule` (text[])**
  comme demandé, et non via des lignes `documents` de type
  `photo_etat_vehicule`.
- **`next.config.ts`** : `serverActions.bodySizeLimit` passé de `10mb`
  à `25mb` pour l'envoi de plusieurs photos en une soumission.
- **`window.open` après Server Action** : peut être bloqué par un
  bloqueur de pop-ups sur certains navigateurs (même comportement que
  le bouton « Voir le document » de l'espace admin déjà en place).
- Vérifié : `npx tsc --noEmit` et `npm run build` passent. La génération
  PDF a été testée isolément (pdf-lib : texte accentué, image, lignes,
  `save()` → `%PDF-`), mais le flux complet de bout en bout nécessite
  un compte propriétaire connecté + Supabase pour être exercé.
