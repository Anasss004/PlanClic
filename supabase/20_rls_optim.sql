-- ============================================================
-- 20_rls_optim.sql — Optimisation des policies RLS
--
-- OBJET
-- Dans une clause RLS, PostgreSQL réévalue auth.uid() et
-- public.current_role() POUR CHAQUE LIGNE examinée. Encapsulées dans un
-- sous-select — (select auth.uid()) — elles deviennent un InitPlan, calculé
-- une seule fois par requête. C'est l'optimisation recommandée par Supabase ;
-- l'écart se creuse avec le nombre de lignes.
--
-- CE QUI NE CHANGE PAS
-- La sémantique de sécurité est strictement identique. Les fonctions sont
-- déjà déclarées `stable`, donc leur valeur ne varie pas au sein d'une même
-- requête : les encapsuler ne peut pas modifier le résultat, seulement le
-- nombre d'évaluations. Aucun nom de policy, aucune table, aucune commande
-- (select/insert/update/delete) et aucun rôle n'est modifié.
--
-- AVANT D'EXÉCUTER
-- Ce fichier a été généré à partir des fichiers de migration du dépôt, PAS
-- depuis la base réelle. Si des policies ont été modifiées directement dans
-- Supabase, les définitions ci-dessous les écraseraient par la version du
-- dépôt. Vérifier d'abord avec la requête de contrôle en fin de fichier.
--
-- Chaque policy est supprimée puis recréée : à exécuter d'un seul bloc, dans
-- une transaction, pour ne jamais laisser une table sans policy.
-- ============================================================

begin;

-- ------------------------------------------------------------
-- Tables métier principales  (source : 03_rls_policies.sql)
-- ------------------------------------------------------------
drop policy if exists "profiles_select_self_or_staff" on public.profiles;
create policy "profiles_select_self_or_staff"
  on public.profiles for select
  using (
    id = (select auth.uid())
    or (select public.current_role()) in ('support', 'admin')
  );
drop policy if exists "profiles_insert_self" on public.profiles;
create policy "profiles_insert_self"
  on public.profiles for insert
  with check (id = (select auth.uid()));
drop policy if exists "profiles_update_self_limited" on public.profiles;
create policy "profiles_update_self_limited"
  on public.profiles for update
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));
drop policy if exists "proprietaires_select_self_or_staff" on public.proprietaires;
create policy "proprietaires_select_self_or_staff"
  on public.proprietaires for select
  using (
    id = (select auth.uid())
    or (select public.current_role()) in ('support', 'admin')
  );
drop policy if exists "proprietaires_insert_self" on public.proprietaires;
create policy "proprietaires_insert_self"
  on public.proprietaires for insert
  with check (
    id = (select auth.uid())
    and (select public.current_role()) = 'proprietaire'
  );
drop policy if exists "proprietaires_update_self_limited" on public.proprietaires;
create policy "proprietaires_update_self_limited"
  on public.proprietaires for update
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));
drop policy if exists "vehicules_select_owner_or_staff_or_client_with_reservation" on public.vehicules;
create policy "vehicules_select_owner_or_staff_or_client_with_reservation"
  on public.vehicules for select
  using (
    proprietaire_id = (select auth.uid())
    or (select public.current_role()) in ('support', 'admin')
    or exists (
      select 1 from public.reservations r
      where r.vehicule_id = vehicules.id and r.client_id = (select auth.uid())
    )
  );
drop policy if exists "vehicules_insert_verified_owner" on public.vehicules;
create policy "vehicules_insert_verified_owner"
  on public.vehicules for insert
  with check (
    proprietaire_id = (select auth.uid())
    and exists (
      select 1 from public.proprietaires
      where id = (select auth.uid()) and statut_verification = 'verifie'
    )
  );
drop policy if exists "vehicules_update_owner" on public.vehicules;
create policy "vehicules_update_owner"
  on public.vehicules for update
  using (proprietaire_id = (select auth.uid()))
  with check (proprietaire_id = (select auth.uid()));
drop policy if exists "reservations_select_participants_or_staff" on public.reservations;
create policy "reservations_select_participants_or_staff"
  on public.reservations for select
  using (
    client_id = (select auth.uid())
    or proprietaire_id = (select auth.uid())
    or (select public.current_role()) in ('support', 'admin')
  );
drop policy if exists "reservations_insert_client" on public.reservations;
create policy "reservations_insert_client"
  on public.reservations for insert
  with check (
    client_id = (select auth.uid())
    and (select public.current_role()) = 'client'
  );
drop policy if exists "documents_select_owner_or_authorized_proprietaire_or_staff" on public.documents;
create policy "documents_select_owner_or_authorized_proprietaire_or_staff"
  on public.documents for select
  using (
    owner_id = (select auth.uid())
    or (select public.current_role()) in ('support', 'admin')
    or (
      -- Un propriétaire ne voit le CIN/permis d'un client QUE s'il a
      -- une réservation active avec lui, et uniquement ces types de
      -- documents (jamais les documents d'un autre propriétaire).
      type_document in ('cin', 'permis')
      and exists (
        select 1 from public.reservations r
        where r.id = documents.reservation_id
          and r.proprietaire_id = (select auth.uid())
          and r.client_id = documents.owner_id
      )
    )
  );
drop policy if exists "documents_insert_own" on public.documents;
create policy "documents_insert_own"
  on public.documents for insert
  with check (owner_id = (select auth.uid()));
drop policy if exists "amendes_select_owner_or_staff" on public.amendes;
create policy "amendes_select_owner_or_staff"
  on public.amendes for select
  using (
    proprietaire_id = (select auth.uid())
    or (select public.current_role()) in ('support', 'admin')
  );
drop policy if exists "amendes_insert_owner" on public.amendes;
create policy "amendes_insert_owner"
  on public.amendes for insert
  with check (proprietaire_id = (select auth.uid()));
drop policy if exists "amendes_update_owner" on public.amendes;
create policy "amendes_update_owner"
  on public.amendes for update
  using (proprietaire_id = (select auth.uid()))
  with check (proprietaire_id = (select auth.uid()));
drop policy if exists "audit_logs_select_staff_only" on public.audit_logs;
create policy "audit_logs_select_staff_only"
  on public.audit_logs for select
  using ((select public.current_role()) in ('support', 'admin'));

-- ------------------------------------------------------------
-- Correctif profiles  (source : 07_fix_profiles_rls.sql)
-- ------------------------------------------------------------
drop policy if exists "profiles_select_client_by_proprietaire_avec_reservation" on public.profiles;
create policy "profiles_select_client_by_proprietaire_avec_reservation"
  on public.profiles for select
  using (
    exists (
      select 1 from public.reservations r
      where r.client_id = profiles.id
        and r.proprietaire_id = (select auth.uid())
    )
  );

-- ------------------------------------------------------------
-- Maintenance et documents véhicule  (source : 11_maintenance_et_blocages.sql)
-- ------------------------------------------------------------
drop policy if exists "maintenance_select_owner_or_staff" on public.maintenance;
create policy "maintenance_select_owner_or_staff"
  on public.maintenance for select
  using (
    proprietaire_id = (select auth.uid())
    or (select public.current_role()) in ('support', 'admin')
  );
drop policy if exists "maintenance_insert_owner" on public.maintenance;
create policy "maintenance_insert_owner"
  on public.maintenance for insert
  with check (proprietaire_id = (select auth.uid()));
drop policy if exists "maintenance_update_owner" on public.maintenance;
create policy "maintenance_update_owner"
  on public.maintenance for update
  using (proprietaire_id = (select auth.uid()))
  with check (proprietaire_id = (select auth.uid()));
drop policy if exists "documents_vehicule_select_owner_or_staff" on public.documents_vehicule;
create policy "documents_vehicule_select_owner_or_staff"
  on public.documents_vehicule for select
  using (
    proprietaire_id = (select auth.uid())
    or (select public.current_role()) in ('support', 'admin')
  );
drop policy if exists "documents_vehicule_insert_owner" on public.documents_vehicule;
create policy "documents_vehicule_insert_owner"
  on public.documents_vehicule for insert
  with check (proprietaire_id = (select auth.uid()));
drop policy if exists "documents_vehicule_update_owner" on public.documents_vehicule;
create policy "documents_vehicule_update_owner"
  on public.documents_vehicule for update
  using (proprietaire_id = (select auth.uid()))
  with check (proprietaire_id = (select auth.uid()));
drop policy if exists "reservations_insert_proprietaire_manuel" on public.reservations;
create policy "reservations_insert_proprietaire_manuel"
  on public.reservations for insert
  with check (
    source = 'manuel'
    and proprietaire_id = (select auth.uid())
    and client_id is null
  );

-- ------------------------------------------------------------
-- Plans et abonnements  (source : 13_saas_plans.sql)
-- ------------------------------------------------------------
drop policy if exists "plans_select_public_ou_staff" on public.plans;
create policy "plans_select_public_ou_staff"
  on public.plans for select
  using (actif = true or (select public.current_role()) in ('support', 'admin'));
drop policy if exists "plans_admin_insert" on public.plans;
create policy "plans_admin_insert"
  on public.plans for insert
  with check ((select public.current_role()) = 'admin');
drop policy if exists "plans_admin_update" on public.plans;
create policy "plans_admin_update"
  on public.plans for update
  using ((select public.current_role()) = 'admin')
  with check ((select public.current_role()) = 'admin');
drop policy if exists "plans_admin_delete" on public.plans;
create policy "plans_admin_delete"
  on public.plans for delete
  using ((select public.current_role()) = 'admin');
drop policy if exists "abonnements_select_owner_ou_staff" on public.abonnements;
create policy "abonnements_select_owner_ou_staff"
  on public.abonnements for select
  using (
    proprietaire_id = (select auth.uid())
    or (select public.current_role()) in ('support', 'admin')
  );

-- ------------------------------------------------------------
-- Panneau d'administration  (source : 14_admin_panel.sql)
-- ------------------------------------------------------------
drop policy if exists "parametres_select_publics_ou_staff" on public.parametres_plateforme;
create policy "parametres_select_publics_ou_staff"
  on public.parametres_plateforme for select
  using (est_public = true or (select public.current_role()) in ('support', 'admin'));
drop policy if exists "notifications_select_destinataire_ou_staff" on public.notifications;
create policy "notifications_select_destinataire_ou_staff"
  on public.notifications for select
  using (destinataire_id = (select auth.uid()) or (select public.current_role()) in ('support', 'admin'));
drop policy if exists "notifications_update_destinataire_lu" on public.notifications;
create policy "notifications_update_destinataire_lu"
  on public.notifications for update
  using (destinataire_id = (select auth.uid()))
  with check (destinataire_id = (select auth.uid()));

-- ------------------------------------------------------------
-- Gestion de location et contrats  (source : 15_gestion_location_contrat.sql)
-- ------------------------------------------------------------
drop policy if exists "contrats_lecture_owner_ou_staff" on storage.objects;
create policy "contrats_lecture_owner_ou_staff"
  on storage.objects for select
  using (
    bucket_id = 'contrats'
    and (
      (storage.foldername(name))[1] = (select auth.uid())::text
      or (select public.current_role()) in ('support', 'admin')
    )
  );
drop policy if exists "contrats_ecriture_owner" on storage.objects;
create policy "contrats_ecriture_owner"
  on storage.objects for insert
  with check (
    bucket_id = 'contrats'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
drop policy if exists "contrats_maj_owner" on storage.objects;
create policy "contrats_maj_owner"
  on storage.objects for update
  using (
    bucket_id = 'contrats'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'contrats'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- ------------------------------------------------------------
-- Buckets de stockage  (source : 04_storage.sql)
-- ------------------------------------------------------------
drop policy if exists "photos_vehicules_ecriture_proprietaire_verifie" on storage.objects;
create policy "photos_vehicules_ecriture_proprietaire_verifie"
  on storage.objects for insert
  with check (
    bucket_id = 'photos-vehicules'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and exists (
      select 1 from public.proprietaires
      where id = (select auth.uid()) and statut_verification = 'verifie'
    )
  );
drop policy if exists "documents_prives_lecture_owner_ou_autorise" on storage.objects;
create policy "documents_prives_lecture_owner_ou_autorise"
  on storage.objects for select
  using (
    bucket_id = 'documents-prives'
    and (
      (storage.foldername(name))[1] = (select auth.uid())::text
      or (select public.current_role()) in ('support', 'admin')
      or exists (
        select 1 from public.documents d
        join public.reservations r on r.id = d.reservation_id
        where d.storage_path = storage.objects.name
          and d.type_document in ('cin', 'permis')
          and r.proprietaire_id = (select auth.uid())
          and r.client_id::text = (storage.foldername(storage.objects.name))[1]
      )
    )
  );
drop policy if exists "documents_prives_ecriture_owner" on storage.objects;
create policy "documents_prives_ecriture_owner"
  on storage.objects for insert
  with check (
    bucket_id = 'documents-prives'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

commit;

-- ============================================================
-- CONTRÔLE APRÈS EXÉCUTION
--
-- Doit renvoyer zéro ligne. Toute ligne restante est une policy qui contient
-- encore un appel non encapsulé — soit créée hors dépôt, soit dans un fichier
-- non couvert ici.
-- ============================================================
--
-- select schemaname, tablename, policyname, qual, with_check
-- from pg_policies
-- where schemaname in ('public', 'storage')
--   and (
--     qual       ~ '(?<!select )auth\.uid\(\)'
--     or with_check ~ '(?<!select )auth\.uid\(\)'
--     or qual       ~ '(?<!select )current_role\(\)'
--     or with_check ~ '(?<!select )current_role\(\)'
--   );
