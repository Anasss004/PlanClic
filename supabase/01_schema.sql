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
