# PlanClic — Checklist de tests RLS

À exécuter **avant tout lancement public**, avec au moins 2 comptes clients de test, 2 comptes propriétaires de test, 1 compte support et 1 compte admin.

**Méthode :** dans Supabase SQL Editor, tu peux simuler un utilisateur précis avec :
```sql
select set_config('request.jwt.claims', json_build_object('sub', '<uuid-du-compte-de-test>')::text, true);
set role authenticated;
```
Puis exécute la requête à tester. N'oublie pas `reset role;` après chaque test.

---

## 1. Isolation entre clients
- [ ] Client A ne voit pas les réservations de Client B (`select * from reservations` en tant que A ne retourne aucune ligne de B)
- [ ] Client A ne voit pas les documents (CIN/permis) de Client B
- [ ] Client A ne peut pas insérer une réservation avec `client_id` = UUID de Client B

## 2. Isolation entre propriétaires
- [ ] Propriétaire A ne voit pas les véhicules de Propriétaire B
- [ ] Propriétaire A ne peut pas modifier (`update`) un véhicule de Propriétaire B
- [ ] Propriétaire A ne voit pas les réservations reçues par Propriétaire B
- [ ] Propriétaire A ne voit pas les amendes de Propriétaire B

## 3. Documents et relation client-propriétaire
- [ ] Propriétaire A ne peut pas voir le CIN/permis d'un client qui n'a **aucune réservation** avec lui
- [ ] Propriétaire A peut voir le CIN/permis d'un client **avec** une réservation confirmée avec lui
- [ ] Une fois la relation testée, vérifier qu'un changement de `reservation_id` sur un document échoue (colonne protégée)

## 4. Anti-escalade de privilèges
- [ ] Un compte `client` ne peut pas exécuter `update profiles set role = 'admin' where id = auth.uid()` avec succès (le trigger doit lever une exception)
- [ ] Un compte `client` ne peut pas appeler `admin_set_role()` (doit lever "Seul un administrateur peut modifier un rôle")
- [ ] Un compte `proprietaire` ne peut pas appeler `verifier_proprietaire()` sur son propre compte pour s'auto-valider
- [ ] Un compte `client` ne peut pas insérer un profil avec `role = 'admin'`

## 5. Modification d'UUID / IDOR
- [ ] Modifier `proprietaire_id` sur un véhicule existant échoue, même pour son propriétaire actuel (trigger d'immutabilité)
- [ ] Modifier `client_id` ou `proprietaire_id` sur une réservation existante échoue
- [ ] Modifier `owner_id` sur un document existant échoue
- [ ] Un client ne peut pas accéder à une réservation en devinant/changeant l'UUID dans l'URL de l'application (vérifier côté front que la donnée vient bien d'une requête filtrée par RLS, pas juste cachée dans l'interface)

## 6. Statuts de réservation
- [ ] Un client ne peut pas confirmer sa propre réservation (`changer_statut_reservation` avec `'confirmee'` doit échouer pour le client)
- [ ] Un propriétaire ne peut pas confirmer une réservation qui n'est pas la sienne
- [ ] Un propriétaire ne peut pas repasser une réservation `refusee` à `confirmee`
- [ ] Un client ne peut pas annuler une réservation déjà confirmée

## 7. Storage
- [ ] Le bucket `documents-prives` refuse toute lecture publique anonyme (tester sans authentification)
- [ ] Un utilisateur ne peut pas uploader dans le dossier d'un autre (`(storage.foldername(name))[1] != auth.uid()`)
- [ ] Une URL Storage directe (non signée) vers un document privé renvoie une erreur d'accès
- [ ] Une URL signée expirée (générée avec une durée très courte pour le test) ne fonctionne plus après expiration

## 8. Audit logs
- [ ] Un compte `client` ou `proprietaire` ne peut pas lire `select * from audit_logs`
- [ ] Un compte `client` ou `proprietaire` ne peut pas insérer directement dans `audit_logs`
- [ ] Vérifier qu'aucune ligne de `audit_logs` ne contient de CIN, numéro de permis ou autre donnée sensible en clair dans `metadata`

## 9. Opérations administratives
- [ ] Un compte `support` peut valider un document (`valider_document`) mais ne peut pas changer un rôle (`admin_set_role` doit échouer pour `support`)
- [ ] Un compte `admin` peut exécuter `admin_set_role` avec succès
- [ ] Toute action via `verifier_proprietaire` / `valider_document` / `admin_set_role` génère bien une ligne dans `audit_logs`

## 10. Fonctions RPC
- [ ] Vérifier qu'aucune fonction `SECURITY DEFINER` ne peut être appelée pour récupérer des données arbitraires (relire `current_role()`, `has_active_relationship()` : elles ne retournent qu'un booléen/texte, jamais de données personnelles brutes)
- [ ] Vérifier que `search_path` est bien fixé sur chaque fonction `SECURITY DEFINER` (`select prosecdef, proconfig from pg_proc where proname = 'nom_fonction';`)

## 11. Messages d'erreur
- [ ] Provoquer volontairement une erreur RLS (accès refusé) et vérifier que le message renvoyé à l'application ne contient aucune donnée personnelle d'un autre utilisateur

---

## Vérification finale automatique (à relancer avant chaque mise en production)

```sql
-- Toutes les tables sensibles doivent avoir RLS activé
select tablename, rowsecurity
from pg_tables
where schemaname = 'public';
-- rowsecurity doit être "true" pour : profiles, proprietaires, vehicules,
-- reservations, documents, amendes, audit_logs

-- Aucun bucket sensible ne doit être public
select id, public from storage.buckets;
-- "documents-prives" doit avoir public = false

-- Aucune policy ne doit être "USING (true)" sans condition
select schemaname, tablename, policyname, qual
from pg_policies
where schemaname in ('public', 'storage');
-- Vérifier manuellement qu'aucune ligne n'a qual = 'true' sans autre condition
```
