-- ============================================================
-- PlanClic — Schéma sécurisé V1 (03/03 — RLS)
-- RLS activé sur TOUTES les tables contenant des données
-- personnelles ou métier. Aucune policy USING (true).
-- Chaque opération (SELECT/INSERT/UPDATE/DELETE) est définie
-- séparément. Tout ce qui n'est pas explicitement autorisé est
-- refusé par défaut (comportement standard de Postgres RLS).
-- ============================================================

alter table public.profiles enable row level security;
alter table public.proprietaires enable row level security;
alter table public.vehicules enable row level security;
alter table public.reservations enable row level security;
alter table public.documents enable row level security;
alter table public.amendes enable row level security;
alter table public.audit_logs enable row level security;

-- ============================================================
-- PROFILES
-- ============================================================
create policy "profiles_select_self_or_staff"
  on public.profiles for select
  using (
    id = auth.uid()
    or public.current_role() in ('support', 'admin')
  );

create policy "profiles_insert_self"
  on public.profiles for insert
  with check (id = auth.uid());
  -- Le rôle par défaut est 'client' (colonne DEFAULT) ; devenir
  -- 'proprietaire' se fait via un champ choisi à l'inscription dans
  -- la même transaction applicative, jamais 'support'/'admin' ici.

create policy "profiles_update_self_limited"
  on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());
  -- Le trigger trg_prevent_role_change bloque toute tentative de
  -- changer sa propre colonne "role" même via cette policy.

-- Pas de policy DELETE : aucune suppression directe (utiliser deleted_at).

-- ============================================================
-- PROPRIETAIRES
-- ============================================================
create policy "proprietaires_select_self_or_staff"
  on public.proprietaires for select
  using (
    id = auth.uid()
    or public.current_role() in ('support', 'admin')
  );

create policy "proprietaires_insert_self"
  on public.proprietaires for insert
  with check (
    id = auth.uid()
    and public.current_role() = 'proprietaire'
  );

create policy "proprietaires_update_self_limited"
  on public.proprietaires for update
  using (id = auth.uid())
  with check (id = auth.uid());
  -- Le trigger trg_prevent_self_verification empêche de modifier
  -- statut_verification/verifie_par par cette voie.

-- Pas de policy DELETE.

-- Vue publique minimale (pas de RC, pas d'adresse précise) pour
-- afficher le nom de l'agence sur les annonces, uniquement si vérifié.
create view public.proprietaires_public as
  select id, nom_entreprise, ville
  from public.proprietaires
  where statut_verification = 'verifie' and deleted_at is null;

-- ============================================================
-- VEHICULES
-- ============================================================
-- Lecture publique limitée aux véhicules actifs d'agences vérifiées,
-- mais SANS l'immatriculation (vue dédiée, jamais la table brute).
create view public.vehicules_recherche as
  select v.id, v.proprietaire_id, v.type, v.marque, v.modele, v.portes,
         v.places, v.carburant, v.transmission, v.couleur, v.prix_jour,
         v.ville, v.photos
  from public.vehicules v
  join public.proprietaires p on p.id = v.proprietaire_id
  where v.statut = 'actif'
    and v.deleted_at is null
    and p.statut_verification = 'verifie';

create policy "vehicules_select_owner_or_staff_or_client_with_reservation"
  on public.vehicules for select
  using (
    proprietaire_id = auth.uid()
    or public.current_role() in ('support', 'admin')
    or exists (
      select 1 from public.reservations r
      where r.vehicule_id = vehicules.id and r.client_id = auth.uid()
    )
  );
  -- Note : la recherche publique (candidats non connectés / recherche
  -- générale) passe par la vue "vehicules_recherche" ci-dessus, pas
  -- par cette policy — l'immatriculation n'y est jamais exposée.

create policy "vehicules_insert_verified_owner"
  on public.vehicules for insert
  with check (
    proprietaire_id = auth.uid()
    and exists (
      select 1 from public.proprietaires
      where id = auth.uid() and statut_verification = 'verifie'
    )
  );

create policy "vehicules_update_owner"
  on public.vehicules for update
  using (proprietaire_id = auth.uid())
  with check (proprietaire_id = auth.uid());
  -- Le trigger empêche de toute façon de changer proprietaire_id.

-- Pas de policy DELETE : désactivation via statut='inactif' ou deleted_at.

-- ============================================================
-- RESERVATIONS
-- ============================================================
create policy "reservations_select_participants_or_staff"
  on public.reservations for select
  using (
    client_id = auth.uid()
    or proprietaire_id = auth.uid()
    or public.current_role() in ('support', 'admin')
  );

create policy "reservations_insert_client"
  on public.reservations for insert
  with check (
    client_id = auth.uid()
    and public.current_role() = 'client'
  );

-- Aucune policy UPDATE directe : tout changement de statut passe
-- OBLIGATOIREMENT par la fonction changer_statut_reservation(), qui
-- encapsule les règles métier et journalise l'action. Cela empêche
-- un client ou un propriétaire de modifier arbitrairement le statut
-- ou toute autre colonne via un UPDATE brut depuis le client Supabase.

-- Pas de policy DELETE.

-- ============================================================
-- DOCUMENTS — la table la plus sensible
-- ============================================================
create policy "documents_select_owner_or_authorized_proprietaire_or_staff"
  on public.documents for select
  using (
    owner_id = auth.uid()
    or public.current_role() in ('support', 'admin')
    or (
      -- Un propriétaire ne voit le CIN/permis d'un client QUE s'il a
      -- une réservation active avec lui, et uniquement ces types de
      -- documents (jamais les documents d'un autre propriétaire).
      type_document in ('cin', 'permis')
      and exists (
        select 1 from public.reservations r
        where r.id = documents.reservation_id
          and r.proprietaire_id = auth.uid()
          and r.client_id = documents.owner_id
      )
    )
  );

create policy "documents_insert_own"
  on public.documents for insert
  with check (owner_id = auth.uid());

-- Aucune policy UPDATE générale : le statut (valide/rejeté) ne change
-- que via valider_document() (support/admin). Le trigger empêche par
-- ailleurs toute réassignation de owner_id.

-- Pas de policy DELETE : suppression logique (deleted_at) uniquement,
-- gérée par une tâche de rétention (voir politique de conservation),
-- jamais par l'utilisateur directement.

-- ============================================================
-- AMENDES
-- ============================================================
create policy "amendes_select_owner_or_staff"
  on public.amendes for select
  using (
    proprietaire_id = auth.uid()
    or public.current_role() in ('support', 'admin')
  );

create policy "amendes_insert_owner"
  on public.amendes for insert
  with check (proprietaire_id = auth.uid());

create policy "amendes_update_owner"
  on public.amendes for update
  using (proprietaire_id = auth.uid())
  with check (proprietaire_id = auth.uid());

-- Pas de policy DELETE.

-- ============================================================
-- AUDIT_LOGS — lecture réservée au staff, écriture jamais directe
-- ============================================================
create policy "audit_logs_select_staff_only"
  on public.audit_logs for select
  using (public.current_role() in ('support', 'admin'));

-- Aucune policy INSERT/UPDATE/DELETE pour les rôles authenticated :
-- les écritures passent exclusivement par log_audit() (SECURITY
-- DEFINER), jamais par un INSERT direct depuis le client.
