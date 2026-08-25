-- ============================================================
-- PlanClic — Schéma de base de données V1
-- À exécuter dans Supabase > SQL Editor
-- ============================================================

-- Extension nécessaire pour les UUID
create extension if not exists "pgcrypto";

-- ============================================================
-- 1. TABLE users (commune à propriétaires et clients)
-- Supabase Auth crée déjà une table "auth.users" pour l'authentification.
-- On crée notre propre table "public.users" pour stocker les infos
-- métier liées à chaque compte, reliée à auth.users par l'id.
-- ============================================================
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('proprietaire', 'client', 'admin')),
  genre text,
  nom text not null,
  prenom text not null,
  date_naissance date,
  telephone text,
  email text not null,
  created_at timestamptz not null default now()
);

-- ============================================================
-- 2. TABLE proprietaires (infos pro, uniquement pour role = proprietaire)
-- ============================================================
create table public.proprietaires (
  id uuid primary key references public.users(id) on delete cascade,
  nom_entreprise text not null,
  specialite text not null check (specialite in ('voitures_utilitaires', 'motos')),
  ville text not null,
  adresse text,
  registre_commerce text not null,
  document_rc_url text,       -- lien vers le fichier RC dans Supabase Storage
  document_id_url text,       -- lien vers la pièce d'identité du gérant
  statut_verification text not null default 'en_attente'
    check (statut_verification in ('en_attente', 'verifie', 'rejete')),
  created_at timestamptz not null default now()
);

-- ============================================================
-- 3. TABLE vehicules
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
  immatriculation text not null,
  prix_jour numeric(10, 2) not null,
  ville text not null,
  photos text[] default '{}',   -- tableau de liens Supabase Storage
  statut text not null default 'actif' check (statut in ('actif', 'inactif')),
  created_at timestamptz not null default now()
);

-- ============================================================
-- 4. TABLE reservations
-- ============================================================
create table public.reservations (
  id uuid primary key default gen_random_uuid(),
  vehicule_id uuid not null references public.vehicules(id) on delete restrict,
  client_id uuid not null references public.users(id) on delete restrict,
  proprietaire_id uuid not null references public.proprietaires(id) on delete restrict,
  date_debut date not null,
  date_fin date not null,
  prix_total numeric(10, 2),
  statut text not null default 'en_attente'
    check (statut in ('en_attente', 'confirmee', 'refusee', 'annulee', 'terminee')),
  documents_client jsonb,        -- { permis_url, cin_url, nb_conducteurs }
  photos_etat_vehicule text[],   -- photos prises le jour J
  signature_proprietaire_url text,
  signature_client_url text,
  contrat_url text,              -- PDF final généré
  created_at timestamptz not null default now(),

  constraint dates_valides check (date_fin > date_debut)
);

-- Empêche deux réservations confirmées de se chevaucher pour le même véhicule
alter table public.reservations
  add constraint no_overlap_confirmed
  exclude using gist (
    vehicule_id with =,
    daterange(date_debut, date_fin) with &&
  )
  where (statut = 'confirmee');

-- Nécessite l'extension btree_gist pour l'exclusion ci-dessus
create extension if not exists "btree_gist";

-- ============================================================
-- 5. TABLE amendes
-- ============================================================
create table public.amendes (
  id uuid primary key default gen_random_uuid(),
  vehicule_id uuid not null references public.vehicules(id) on delete cascade,
  proprietaire_id uuid not null references public.proprietaires(id) on delete cascade,
  reservation_id uuid references public.reservations(id),
  date_amende date not null,
  numero_immatriculation text not null,
  created_at timestamptz not null default now()
);

-- ============================================================
-- Index utiles pour la performance des requêtes fréquentes
-- ============================================================
create index idx_vehicules_proprietaire on public.vehicules(proprietaire_id);
create index idx_vehicules_ville_type on public.vehicules(ville, type) where statut = 'actif';
create index idx_reservations_proprietaire on public.reservations(proprietaire_id);
create index idx_reservations_client on public.reservations(client_id);
create index idx_reservations_vehicule on public.reservations(vehicule_id);
