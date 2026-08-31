# Espace Propriétaire — Améliorations UX V2

Branche : `feature/ux-proprietaire-v2` (partie du travail « Nouvelle
location + contrat », **pas** de `main` — voir note plus bas).

## 1. Migrations Supabase à exécuter (dans l'ordre)

| Ordre | Fichier | Statut |
|-------|---------|--------|
| … | `14_admin_panel.sql` | déjà listé ailleurs |
| … | `15_gestion_location_contrat.sql` | déjà listé ailleurs |
| **1** | **`supabase/16_horaires_lieux_reservation.sql`** | **nouveau — à lancer** |

`16_*` ajoute les colonnes `heure_debut`, `lieu_debut`, `heure_fin`,
`lieu_fin` sur `reservations`, **remplace** `creer_location_manuelle()`
(l'ancienne signature à 8 arguments est `DROP`ée, la nouvelle en a 12),
et ajoute `maj_details_location()` (`SECURITY DEFINER`, revérifie que
l'appelant est le propriétaire). Idempotent hors `create policy`.

## 2. Changements de props sur composants partagés

| Composant | Changement | Impact |
|-----------|-----------|--------|
| `useToast()` (`components/ui/Toast.tsx`) | **+ méthodes** `info()`, `action()`, `dismiss()`, `undoable()`. `success()` / `error()` **inchangées**. | Rétrocompatible. Tous les conscommateurs existants continuent de fonctionner. |
| `StatCard` | Aucun changement — la prop `trend` existait déjà, elle est simplement utilisée sur le dashboard et les stats. | Aucun. |
| `DatePicker`, `FileUpload`, `Badge`, `EmptyState` | Aucun changement de signature. | Aucun. |

**Nouveaux providers globaux** (`app/layout.tsx`) : `<ConfirmProvider>`
ajouté à l'intérieur de `<ToastProvider>`. `useConfirm()` est désormais
disponible partout.

## 3. Fichiers créés

- `src/lib/dates.ts` — `formaterDate`, `formaterPeriode`, `formaterHeure`, `nombreDeJours`, `formaterRelatif`
- `src/components/ui/ConfirmDialog.tsx` — `ConfirmProvider` + `useConfirm()`
- `src/components/proprietaire/FormulaireNouvelleLocation.tsx` — formulaire « Nouvelle location » (client), prix auto + remises + heure/lieu
- `src/components/proprietaire/ListeReservations.tsx` — recherche / filtres / pagination
- `src/components/proprietaire/ListeVehicules.tsx` — recherche / filtres ville+catégorie / pagination
- `src/components/proprietaire/ContactClient.tsx` — bouton Appeler + menu de modèles WhatsApp
- `src/components/proprietaire/GestionPhotosVehicule.tsx` — suppression + photo de couverture
- `src/components/proprietaire/ChecklistOnboarding.tsx` — checklist 3 étapes, masquable
- `src/components/proprietaire/FluxNotifications.tsx` — flux de notifications unifié

## 4. Fichiers modifiés (récap par point du prompt)

| Point | Fichiers |
|-------|----------|
| 1 — prix auto affiné | `FormulaireNouvelleLocation.tsx`, `bloquer/page.tsx`, `actions/proprietaire.ts` |
| 2 — heure/lieu | `16_*.sql`, `FormulaireNouvelleLocation.tsx`, `actions/proprietaire.ts`, `lib/contrat-pdf.ts`, `ListeReservations.tsx`, `calendrier/page.tsx`, `ReservationForm.tsx`, `actions/client.ts` |
| 3 — dates lisibles | `lib/dates.ts` appliqué à : `ListeReservations`, `calendrier/page.tsx`, `dashboard/page.tsx`, `vehicules/[id]/page.tsx`, `ListeVehicules`, `contrat-pdf.ts`, `FluxNotifications` |
| 4 — recherche/filtres/pagination | `reservations/page.tsx` + `ListeReservations.tsx` ; `vehicules/page.tsx` + `ListeVehicules.tsx` |
| 5 — photos véhicule | `GestionPhotosVehicule.tsx`, `vehicules/[id]/modifier/page.tsx`, `actions/proprietaire.ts` (`supprimerPhotoVehicule`, `definirPhotoCouverture`) |
| 6 — confirmations | `ConfirmDialog.tsx`, `layout.tsx` (root), `AnnulerBlocageButton.tsx`, `MenuActionsVehicule.tsx`, `GestionPhotosVehicule.tsx` |
| 7 — checklist onboarding | `ChecklistOnboarding.tsx`, `dashboard/page.tsx` |
| 8 — tendances réelles | `dashboard/page.tsx`, `statistiques/page.tsx` |
| 9 — notifications | `notifications/page.tsx`, `FluxNotifications.tsx`, `proprietaire/layout.tsx` (pastille) |
| 10 — undo | `Toast.tsx` (`undoable`), `ActionsReservation.tsx` (terminée), `MenuActionsVehicule.tsx` (suppression) |
| 11 — contact | `ContactClient.tsx`, intégré dans `ListeReservations.tsx` |

## 5. Points nécessitant ton arbitrage

1. **Branche.** `feature/ux-proprietaire-v2` a été créée à partir de
   `feature/gestion-location-contrat` (non fusionnée sur `main`), parce
   que V2 s'appuie sur le formulaire « Nouvelle location » et le contrat
   PDF. Si tu veux fusionner d'abord `gestion-location-contrat` → `main`,
   je pourrai rebaser proprement.
2. **`maj_details_location()`** est créée (migration 16) mais **aucune UI
   ne l'appelle encore**. Elle permettrait au propriétaire d'ajuster
   heure/lieu d'une réservation **après création** (utile surtout pour
   les réservations en ligne, où le client ne renseigne que ses
   préférences). Veux-tu un petit formulaire d'édition inline sur la
   carte réservation ?
3. **Undo = délai de grâce côté client (5 s).** Si l'utilisateur ferme
   l'onglet ou navigue pendant ces 5 s, l'action « supprimer véhicule » /
   « marquer terminée » n'est **jamais** appliquée (le timer meurt avec
   la page). Acceptable pour V1 ? Une vraie implémentation nécessiterait
   une colonne `pending_until` + un job serveur.
4. **`confirm()` restants hors espace propriétaire** : `SelecteurRole`,
   `ActionsAgence` (admin) et `MesReservations` (espace client) utilisent
   encore `window.confirm`. Je les ai laissés (hors périmètre « Espace
   Propriétaire »). Je les convertis aussi ?
5. **Suppression de photo** : le fichier dans le bucket public
   `photos-vehicules` n'est pas supprimé (pas de policy `DELETE` sur ce
   bucket). L'URL disparaît de la liste `photos` du véhicule (donc plus
   affichée nulle part), mais l'objet reste dans le Storage. Ajouter une
   policy `DELETE` ou une tâche de nettoyage ?
6. **Champ heure** : il n'existe pas de `TimePicker` dans le projet
   (`DatePicker` seulement). J'utilise `<input type="time">` natif,
   stylé pour se fondre. OK ?

## 6. Vérifications

- `npm run build` : ✅
- `npx tsc --noEmit` : ✅
- `npm run lint` : 11 erreurs, **toutes préexistantes** (aucune dans les
  fichiers ajoutés/modifiés par V2).
