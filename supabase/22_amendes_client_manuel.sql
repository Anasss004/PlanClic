-- ============================================================
-- 22_amendes_client_manuel.sql
--
-- Client de secours sur une amende.
--
-- CONTEXTE
-- La table `amendes` porte DÉJÀ tout ce qu'il faut pour rattacher une amende
-- à une location : `vehicule_id` (not null) et `reservation_id` (nullable,
-- clé étrangère vers reservations.id). Aucune colonne de liaison n'est donc
-- à créer — vérifié sur la base, pas seulement dans les fichiers du dépôt.
--
-- Ce qui manquait : de quoi renseigner le locataire à la main quand AUCUNE
-- réservation ne couvre la date de l'amende. Cela arrive dans deux cas
-- réels : le véhicule n'était pas loué ce jour-là, ou la location a été
-- reçue hors PlanClic sans être enregistrée. Jusqu'ici l'amende était
-- enregistrée avec reservation_id à null et le locataire définitivement
-- perdu.
--
-- CHOIX DES NOMS
-- nom_client_manuel / telephone_client_manuel : mêmes noms que sur
-- `reservations`, où ils désignent déjà exactement la même chose (un client
-- saisi à la main plutôt que rattaché à un compte).
--
-- Les deux colonnes sont nullables : elles ne servent que de secours, une
-- amende rattachée à une réservation les laisse vides et lit le client via
-- la réservation.
-- ============================================================

alter table public.amendes
  add column if not exists nom_client_manuel text,
  add column if not exists telephone_client_manuel text;

comment on column public.amendes.nom_client_manuel is
  'Locataire saisi à la main lorsqu''aucune réservation ne couvre la date de l''amende. Null si reservation_id est renseigné.';

comment on column public.amendes.telephone_client_manuel is
  'Téléphone du locataire saisi à la main. Null si reservation_id est renseigné.';

-- ============================================================
-- CONTRÔLE APRÈS EXÉCUTION
--
-- Doit renvoyer les deux nouvelles colonnes, plus reservation_id et
-- vehicule_id qui existaient déjà.
--
-- select column_name, data_type, is_nullable
-- from information_schema.columns
-- where table_schema = 'public' and table_name = 'amendes'
-- order by ordinal_position;
-- ============================================================
