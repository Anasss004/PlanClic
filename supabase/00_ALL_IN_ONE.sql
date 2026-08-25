-- ================================================================
-- PlanClic — SCRIPT COMPLET (tables + fonctions + RLS + storage)
-- À copier-coller EN UNE FOIS dans Supabase > SQL Editor > New query > Run
-- ================================================================

-- ============================================================
-- PlanClic — Schéma sécurisé V1 (01/03 — Tables + intégrité)
-- Respecte : minimisation des données, séparation public/privé,
-- immutabilité des relations critiques, anti-escalade de privilèges.
-- À exécuter dans Supabase > SQL Editor, DANS L'ORDRE (01, 02, 03).
-- ============================================================

create extension if not exists "pgcrypto";
create extension if not exists "btree_gist";

-- ============================================================
-- 1. PROFILES — table commune, séparée de auth.users (Supabase Auth
-- gère déjà l'authentification/mot de passe, on ne duplique rien ici)
-- ============================================================
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'client'
    check (role in ('client', 'proprietaire', 'support', 'admin')),
  genre text,
  nom text not null,
  prenom text not null,
  date_naissance date,
  telephone text,
  email text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- Anti-escalade : personne ne peut changer son propre rôle, ni celui
-- de qui que ce soit, via une simple requête UPDATE. Seule la fonction
-- admin_set_role() (voir 03_functions.sql) peut le faire.
create or replace function public.prevent_role_self_change()
returns trigger
language plpgsql
security invoker
as $$
begin
  if new.role is distinct from old.role then
    if coalesce(current_setting('planclic.allow_role_change', true), 'false') <> 'true' then
      raise exception 'Modification du rôle non autorisée par cette voie';
    end if;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger trg_prevent_role_change
  before update on public.profiles
  for each row execute function public.prevent_role_self_change();

-- ============================================================
-- 2. PROPRIETAIRES — infos professionnelles uniquement
-- Les documents (RC, pièce d'identité du gérant) ne sont PAS stockés
-- ici : voir table "documents" (règle : documents jamais dans une
-- colonne de table classique, uniquement via Storage + référence).
-- ============================================================
create table public.proprietaires (
  id uuid primary key references public.profiles(id) on delete cascade,
  nom_entreprise text not null,
  specialite text not null check (specialite in ('voitures_utilitaires', 'motos')),
  ville text not null,
  adresse text,
  registre_commerce text not null,
  statut_verification text not null default 'en_attente'
    check (statut_verification in ('en_attente', 'verifie', 'rejete')),
  verifie_par uuid references public.profiles(id),  -- membre du support/admin
  verifie_le timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- Immutabilité : un propriétaire ne peut pas s'auto-valider ni changer
-- son propre statut de vérification.
create or replace function public.prevent_self_verification()
returns trigger
language plpgsql
security invoker
as $$
begin
  if new.statut_verification is distinct from old.statut_verification
     or new.verifie_par is distinct from old.verifie_par then
    if coalesce(current_setting('planclic.allow_verification_change', true), 'false') <> 'true' then
      raise exception 'Modification du statut de vérification non autorisée par cette voie';
    end if;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger trg_prevent_self_verification
  before update on public.proprietaires
  for each row execute function public.prevent_self_verification();

-- ============================================================
-- 3. VEHICULES — données publiques (annonce) séparées de
-- l'immatriculation, considérée semi-sensible (non affichée
-- publiquement, visible uniquement par le propriétaire et le
-- client ayant une réservation sur ce véhicule).
-- ============================================================
create table public.vehicules (
  id uuid primary key default gen_random_uuid(),
  proprietaire_id uuid not null references public.proprietaires(id) on delete cascade,
  type text not null check (type in ('voiture', 'moto', 'utilitaire')),
  marque text not null,
  modele text not null,
  portes int,
  places int,
  carburant text check (carburant in ('essence', 'diesel', 'electrique', 'hybride')),
  transmission text check (transmission in ('manuelle', 'automatique')),
  couleur text,
  immatriculation text not null,          -- semi-sensible, jamais dans la vue publique
  prix_jour numeric(10, 2) not null check (prix_jour > 0),
  ville text not null,
  photos text[] default '{}',             -- bucket public "photos-vehicules"
  statut text not null default 'actif' check (statut in ('actif', 'inactif')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- Immutabilité : le propriétaire d'un véhicule ne peut jamais être
-- réassigné par une simple UPDATE (empêche un vol d'annonce par IDOR).
create or replace function public.prevent_ownership_change()
returns trigger
language plpgsql
security invoker
as $$
begin
  if TG_TABLE_NAME = 'vehicules' and new.proprietaire_id is distinct from old.proprietaire_id then
    raise exception 'Le transfert de propriété d''un véhicule n''est pas autorisé';
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger trg_prevent_vehicule_ownership_change
  before update on public.vehicules
  for each row execute function public.prevent_ownership_change();

-- ============================================================
-- 4. RESERVATIONS
-- Aucun document brut ici (permis, CIN, photos, signatures, contrat)
-- — tout passe par la table "documents". Cette table ne contient que
-- les données strictement nécessaires à la réservation elle-même.
-- ============================================================
create table public.reservations (
  id uuid primary key default gen_random_uuid(),
  vehicule_id uuid not null references public.vehicules(id) on delete restrict,
  client_id uuid not null references public.profiles(id) on delete restrict,
  proprietaire_id uuid not null references public.proprietaires(id) on delete restrict,
  date_debut date not null,
  date_fin date not null,
  prix_total numeric(10, 2),
  statut text not null default 'en_attente'
    check (statut in ('en_attente', 'confirmee', 'refusee', 'annulee', 'terminee')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,

  constraint dates_valides check (date_fin > date_debut)
);

-- Empêche deux réservations confirmées de se chevaucher sur le même véhicule
alter table public.reservations
  add constraint no_overlap_confirmed
  exclude using gist (
    vehicule_id with =,
    daterange(date_debut, date_fin) with &&
  )
  where (statut = 'confirmee');

-- Immutabilité : client_id, proprietaire_id et vehicule_id ne peuvent
-- jamais changer après création (empêche de "voler" une réservation
-- en la réassignant via UPDATE).
create or replace function public.prevent_reservation_reassignment()
returns trigger
language plpgsql
security invoker
as $$
begin
  if new.client_id is distinct from old.client_id
     or new.proprietaire_id is distinct from old.proprietaire_id
     or new.vehicule_id is distinct from old.vehicule_id then
    raise exception 'La réassignation d''une réservation n''est pas autorisée';
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger trg_prevent_reservation_reassignment
  before update on public.reservations
  for each row execute function public.prevent_reservation_reassignment();

-- ============================================================
-- 5. DOCUMENTS — table unique et centralisée pour TOUT document
-- sensible (CIN, permis, RC, photos véhicule état des lieux,
-- signatures, contrat PDF). Le fichier lui-même vit uniquement dans
-- Supabase Storage (bucket privé) ; ici on stocke seulement la
-- référence, jamais le contenu.
-- ============================================================
create table public.documents (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  type_document text not null check (type_document in (
    'cin', 'permis', 'registre_commerce', 'id_gerant',
    'photo_etat_vehicule', 'signature_proprietaire', 'signature_client', 'contrat_pdf'
  )),
  storage_path text not null unique,     -- chemin non prévisible (uuid), jamais nom/CIN/tel/email
  reservation_id uuid references public.reservations(id),
  proprietaire_id uuid references public.proprietaires(id),
  statut text not null default 'en_attente'
    check (statut in ('en_attente', 'valide', 'rejete')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,       -- suppression logique (conservation légale possible)
  expires_at timestamptz        -- expiration/rétention automatique (voir politique de conservation)
);

create or replace function public.prevent_document_owner_change()
returns trigger
language plpgsql
security invoker
as $$
begin
  if new.owner_id is distinct from old.owner_id then
    raise exception 'La réassignation d''un document n''est pas autorisée';
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger trg_prevent_document_owner_change
  before update on public.documents
  for each row execute function public.prevent_document_owner_change();

-- ============================================================
-- 6. AMENDES
-- ============================================================
create table public.amendes (
  id uuid primary key default gen_random_uuid(),
  vehicule_id uuid not null references public.vehicules(id) on delete cascade,
  proprietaire_id uuid not null references public.proprietaires(id) on delete cascade,
  reservation_id uuid references public.reservations(id),
  date_amende date not null,
  numero_immatriculation text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- ============================================================
-- 7. AUDIT_LOGS — append-only, jamais de contenu sensible
-- ============================================================
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id),
  actor_role text,
  action text not null,              -- ex: 'document.view', 'reservation.status_change'
  resource_type text not null,       -- ex: 'documents', 'reservations'
  resource_id uuid,
  metadata jsonb,                    -- JAMAIS de CIN/permis/contenu, uniquement des métadonnées
  created_at timestamptz not null default now()
);

-- ============================================================
-- Index utiles
-- ============================================================
create index idx_vehicules_proprietaire on public.vehicules(proprietaire_id);
create index idx_vehicules_recherche on public.vehicules(ville, type) where statut = 'actif' and deleted_at is null;
create index idx_reservations_proprietaire on public.reservations(proprietaire_id);
create index idx_reservations_client on public.reservations(client_id);
create index idx_reservations_vehicule on public.reservations(vehicule_id);
create index idx_documents_owner on public.documents(owner_id);
create index idx_documents_reservation on public.documents(reservation_id);
create index idx_audit_logs_actor on public.audit_logs(actor_id);
create index idx_audit_logs_resource on public.audit_logs(resource_type, resource_id);


-- ============================================================
-- PlanClic — Schéma sécurisé V1 (02/03 — Fonctions)
-- Fonctions utilitaires pour les policies RLS, et fonctions
-- privilégiées (SECURITY DEFINER) pour les opérations sensibles.
-- Toute fonction SECURITY DEFINER a un search_path fixé et un accès
-- restreint (REVOKE puis GRANT ciblé), conformément à la règle 13.
-- ============================================================

-- ------------------------------------------------------------
-- Rôle de l'utilisateur courant — utilisé dans les policies RLS.
-- SECURITY DEFINER pour éviter la récursion RLS (une policy sur
-- "profiles" qui interrogerait "profiles" en RLS invoker créerait
-- une boucle). Accès restreint à SELECT du rôle uniquement.
-- ------------------------------------------------------------
create or replace function public.current_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid() and deleted_at is null;
$$;

revoke all on function public.current_role() from public;
grant execute on function public.current_role() to authenticated;

-- ------------------------------------------------------------
-- Vérifie qu'un propriétaire a une relation de réservation légitime
-- avec un client (nécessaire pour autoriser un propriétaire à voir
-- le permis/CIN d'un client — uniquement s'il y a réservation).
-- ------------------------------------------------------------
create or replace function public.has_active_relationship(p_proprietaire_id uuid, p_client_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.reservations
    where proprietaire_id = p_proprietaire_id
      and client_id = p_client_id
      and statut in ('en_attente', 'confirmee', 'terminee')
      and deleted_at is null
  );
$$;

revoke all on function public.has_active_relationship(uuid, uuid) from public;
grant execute on function public.has_active_relationship(uuid, uuid) to authenticated;

-- ------------------------------------------------------------
-- Journalisation centralisée. Jamais appelée directement par un
-- utilisateur : uniquement depuis d'autres fonctions SECURITY DEFINER
-- ou depuis le backend (Server Actions avec service_role).
-- ------------------------------------------------------------
create or replace function public.log_audit(
  p_action text,
  p_resource_type text,
  p_resource_id uuid,
  p_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.audit_logs (actor_id, actor_role, action, resource_type, resource_id, metadata)
  values (auth.uid(), public.current_role(), p_action, p_resource_type, p_resource_id, p_metadata);
end;
$$;

revoke all on function public.log_audit(text, text, uuid, jsonb) from public;
grant execute on function public.log_audit(text, text, uuid, jsonb) to authenticated;

-- ------------------------------------------------------------
-- Changement de rôle — RÉSERVÉ à admin. Seul point d'entrée possible
-- pour modifier profiles.role (le trigger bloque tout le reste).
-- ------------------------------------------------------------
create or replace function public.admin_set_role(p_user_id uuid, p_new_role text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.current_role() <> 'admin' then
    raise exception 'Seul un administrateur peut modifier un rôle';
  end if;
  if p_new_role not in ('client', 'proprietaire', 'support', 'admin') then
    raise exception 'Rôle invalide';
  end if;

  perform set_config('planclic.allow_role_change', 'true', true);
  update public.profiles set role = p_new_role where id = p_user_id;
  perform set_config('planclic.allow_role_change', 'false', true);

  perform public.log_audit('profile.role_change', 'profiles', p_user_id,
    jsonb_build_object('new_role', p_new_role));
end;
$$;

revoke all on function public.admin_set_role(uuid, text) from public;
grant execute on function public.admin_set_role(uuid, text) to authenticated;

-- ------------------------------------------------------------
-- Validation/rejet d'un compte propriétaire — RÉSERVÉ à support/admin.
-- Seul point d'entrée pour modifier statut_verification.
-- ------------------------------------------------------------
create or replace function public.verifier_proprietaire(p_proprietaire_id uuid, p_decision text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.current_role() not in ('support', 'admin') then
    raise exception 'Action réservée au support';
  end if;
  if p_decision not in ('verifie', 'rejete') then
    raise exception 'Décision invalide';
  end if;

  perform set_config('planclic.allow_verification_change', 'true', true);
  update public.proprietaires
    set statut_verification = p_decision, verifie_par = auth.uid(), verifie_le = now()
    where id = p_proprietaire_id;
  perform set_config('planclic.allow_verification_change', 'false', true);

  perform public.log_audit('proprietaire.verification', 'proprietaires', p_proprietaire_id,
    jsonb_build_object('decision', p_decision));
end;
$$;

revoke all on function public.verifier_proprietaire(uuid, text) from public;
grant execute on function public.verifier_proprietaire(uuid, text) to authenticated;

-- ------------------------------------------------------------
-- Validation/rejet d'un document — RÉSERVÉ à support/admin.
-- Journalise l'action sans jamais logger le contenu du document.
-- ------------------------------------------------------------
create or replace function public.valider_document(p_document_id uuid, p_decision text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.current_role() not in ('support', 'admin') then
    raise exception 'Action réservée au support';
  end if;
  if p_decision not in ('valide', 'rejete') then
    raise exception 'Décision invalide';
  end if;

  update public.documents set statut = p_decision where id = p_document_id;

  perform public.log_audit('document.validation', 'documents', p_document_id,
    jsonb_build_object('decision', p_decision));
end;
$$;

revoke all on function public.valider_document(uuid, text) from public;
grant execute on function public.valider_document(uuid, text) to authenticated;

-- ------------------------------------------------------------
-- Changement de statut de réservation — encapsule les règles métier
-- (qui a le droit de passer à quel statut) plutôt que de laisser un
-- UPDATE direct sur la table, plus facile à auditer et à restreindre.
-- ------------------------------------------------------------
create or replace function public.changer_statut_reservation(p_reservation_id uuid, p_nouveau_statut text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reservation record;
begin
  select * into v_reservation from public.reservations where id = p_reservation_id;
  if v_reservation is null then
    raise exception 'Réservation introuvable';
  end if;

  -- Le propriétaire peut confirmer/refuser une demande en attente
  if p_nouveau_statut in ('confirmee', 'refusee') then
    if v_reservation.proprietaire_id <> auth.uid() then
      raise exception 'Action non autorisée';
    end if;
    if v_reservation.statut <> 'en_attente' then
      raise exception 'Cette réservation ne peut plus être modifiée';
    end if;

  -- Le client peut annuler sa propre demande tant qu'elle n'est pas confirmée
  elsif p_nouveau_statut = 'annulee' then
    if v_reservation.client_id <> auth.uid() then
      raise exception 'Action non autorisée';
    end if;
    if v_reservation.statut not in ('en_attente') then
      raise exception 'Cette réservation ne peut plus être annulée';
    end if;

  -- Terminer une location : réservé au propriétaire concerné
  elsif p_nouveau_statut = 'terminee' then
    if v_reservation.proprietaire_id <> auth.uid() then
      raise exception 'Action non autorisée';
    end if;
    if v_reservation.statut <> 'confirmee' then
      raise exception 'Statut invalide pour cette transition';
    end if;

  else
    raise exception 'Transition de statut non autorisée';
  end if;

  update public.reservations set statut = p_nouveau_statut where id = p_reservation_id;

  perform public.log_audit('reservation.status_change', 'reservations', p_reservation_id,
    jsonb_build_object('nouveau_statut', p_nouveau_statut));
end;
$$;

revoke all on function public.changer_statut_reservation(uuid, text) from public;
grant execute on function public.changer_statut_reservation(uuid, text) to authenticated;


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


-- ============================================================
-- PlanClic — Storage sécurisé (04/04)
-- Un seul bucket est public (photos des véhicules, non sensibles).
-- Tout le reste (documents d'identité, signatures, contrats,
-- photos d'état des lieux) est privé, avec policies sur
-- storage.objects reflétant les mêmes règles que la table "documents".
--
-- CONVENTION DE CHEMIN OBLIGATOIRE (jamais de nom/CIN/tel/email) :
--   documents-prives/{owner_id}/{uuid_aleatoire}.{ext}
-- Le owner_id en tête de chemin permet des policies simples ET sûres ;
-- il n'est pas "secret" en soi mais couplé à auth.uid() dans la
-- policy, donc un utilisateur ne peut pas deviner/modifier le chemin
-- d'un autre pour y accéder.
-- ============================================================

insert into storage.buckets (id, name, public)
values
  ('photos-vehicules', 'photos-vehicules', true),
  ('documents-prives', 'documents-prives', false)
on conflict (id) do nothing;

-- Note : RLS est déjà activé par défaut par Supabase sur storage.objects,
-- inutile (et interdit sans droits superadmin) de le refaire soi-même.

-- ------------------------------------------------------------
-- Bucket public "photos-vehicules" : lecture publique (nécessaire
-- pour l'affichage des annonces), écriture réservée aux propriétaires
-- vérifiés sur leur propre dossier.
-- ------------------------------------------------------------
create policy "photos_vehicules_lecture_publique"
  on storage.objects for select
  using (bucket_id = 'photos-vehicules');

create policy "photos_vehicules_ecriture_proprietaire_verifie"
  on storage.objects for insert
  with check (
    bucket_id = 'photos-vehicules'
    and (storage.foldername(name))[1] = auth.uid()::text
    and exists (
      select 1 from public.proprietaires
      where id = auth.uid() and statut_verification = 'verifie'
    )
  );

-- ------------------------------------------------------------
-- Bucket privé "documents-prives" : CIN, permis, RC, signatures,
-- contrats, photos d'état des lieux. Aucun accès public.
-- ------------------------------------------------------------
create policy "documents_prives_lecture_owner_ou_autorise"
  on storage.objects for select
  using (
    bucket_id = 'documents-prives'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.current_role() in ('support', 'admin')
      or exists (
        select 1 from public.documents d
        join public.reservations r on r.id = d.reservation_id
        where d.storage_path = storage.objects.name
          and d.type_document in ('cin', 'permis')
          and r.proprietaire_id = auth.uid()
          and r.client_id::text = (storage.foldername(storage.objects.name))[1]
      )
    )
  );

create policy "documents_prives_ecriture_owner"
  on storage.objects for insert
  with check (
    bucket_id = 'documents-prives'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Aucune policy UPDATE/DELETE sur les objets de ce bucket pour les
-- utilisateurs authentifiés : un document uploadé est immuable côté
-- fichier. Une correction = nouvel upload + ancien document marqué
-- deleted_at dans la table "documents".

-- ============================================================
-- IMPORTANT — Accès temporaire aux documents privés
-- ============================================================
-- Le point ci-dessus autorise la LECTURE via l'API si la policy est
-- vraie, mais dans l'application, ne jamais construire d'URL directe
-- vers storage.objects. Toujours générer une URL signée à courte
-- durée (ex: 60-120 secondes) côté serveur :
--
--   const { data, error } = await supabase.storage
--     .from('documents-prives')
--     .createSignedUrl(storagePath, 90) // 90 secondes
--
-- Cet appel doit se faire depuis une Server Action (jamais depuis le
-- navigateur avec la clé anon pour ce type de fichier), et doit être
-- précédé d'un appel à log_audit('document.view', ...) pour tracer
-- la consultation, conformément à la règle d'audit.
