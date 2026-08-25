-- ============================================================
-- PlanClic — Maintenance, documents véhicule (alertes d'expiration),
-- et blocage manuel de véhicule (réservation reçue hors PlanClic).
-- ============================================================

-- ------------------------------------------------------------
-- 1. Kilométrage courant du véhicule (pour calculer les rappels
-- d'entretien basés sur les km parcourus).
-- ------------------------------------------------------------
alter table public.vehicules
  add column if not exists kilometrage_actuel int;

-- ------------------------------------------------------------
-- 2. MAINTENANCE — historique des interventions (vidange, essence,
-- réparations...) avec coût, pour calculer la rentabilité nette.
-- ------------------------------------------------------------
create table public.maintenance (
  id uuid primary key default gen_random_uuid(),
  vehicule_id uuid not null references public.vehicules(id) on delete cascade,
  proprietaire_id uuid not null references public.proprietaires(id) on delete cascade,
  type text not null check (type in ('vidange', 'carburant', 'reparation', 'pneus', 'assurance', 'autre')),
  date_intervention date not null,
  kilometrage int,
  cout numeric(10, 2),
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

alter table public.maintenance enable row level security;

create policy "maintenance_select_owner_or_staff"
  on public.maintenance for select
  using (
    proprietaire_id = auth.uid()
    or public.current_role() in ('support', 'admin')
  );

create policy "maintenance_insert_owner"
  on public.maintenance for insert
  with check (proprietaire_id = auth.uid());

create policy "maintenance_update_owner"
  on public.maintenance for update
  using (proprietaire_id = auth.uid())
  with check (proprietaire_id = auth.uid());

create index idx_maintenance_vehicule on public.maintenance(vehicule_id);

-- ------------------------------------------------------------
-- 3. DOCUMENTS_VEHICULE — assurance, contrôle technique, vignette,
-- avec date d'expiration, pour les alertes avant échéance.
-- ------------------------------------------------------------
create table public.documents_vehicule (
  id uuid primary key default gen_random_uuid(),
  vehicule_id uuid not null references public.vehicules(id) on delete cascade,
  proprietaire_id uuid not null references public.proprietaires(id) on delete cascade,
  type text not null check (type in ('assurance', 'controle_technique', 'vignette')),
  date_expiration date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.documents_vehicule enable row level security;

create policy "documents_vehicule_select_owner_or_staff"
  on public.documents_vehicule for select
  using (
    proprietaire_id = auth.uid()
    or public.current_role() in ('support', 'admin')
  );

create policy "documents_vehicule_insert_owner"
  on public.documents_vehicule for insert
  with check (proprietaire_id = auth.uid());

create policy "documents_vehicule_update_owner"
  on public.documents_vehicule for update
  using (proprietaire_id = auth.uid())
  with check (proprietaire_id = auth.uid());

create index idx_documents_vehicule_vehicule on public.documents_vehicule(vehicule_id);

-- ------------------------------------------------------------
-- 4. RESERVATIONS — support des blocages manuels (réservation
-- reçue par téléphone/Instagram/etc., pas via PlanClic). On
-- réutilise la même table pour que la contrainte anti-chevauchement
-- déjà en place protège aussi ces blocages.
-- ------------------------------------------------------------
alter table public.reservations alter column client_id drop not null;

alter table public.reservations
  add column source text not null default 'planclic' check (source in ('planclic', 'manuel')),
  add column nom_client_manuel text,
  add column telephone_client_manuel text;

alter table public.reservations
  add constraint coherence_source check (
    (source = 'planclic' and client_id is not null)
    or
    (source = 'manuel' and client_id is null and nom_client_manuel is not null)
  );

-- Policy d'insertion pour un blocage manuel (le propriétaire crée
-- directement une réservation confirmée, sans étape de demande —
-- c'est lui qui bloque son propre véhicule).
create policy "reservations_insert_proprietaire_manuel"
  on public.reservations for insert
  with check (
    source = 'manuel'
    and proprietaire_id = auth.uid()
    and client_id is null
  );

-- ------------------------------------------------------------
-- 5. Fonctions sécurisées pour bloquer / débloquer un véhicule
-- ------------------------------------------------------------
create or replace function public.bloquer_vehicule(
  p_vehicule_id uuid,
  p_date_debut date,
  p_date_fin date,
  p_nom_client text,
  p_telephone_client text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_proprietaire_id uuid;
  v_nouvel_id uuid;
begin
  select proprietaire_id into v_proprietaire_id
  from public.vehicules where id = p_vehicule_id;

  if v_proprietaire_id is null or v_proprietaire_id <> auth.uid() then
    raise exception 'Action non autorisée';
  end if;

  insert into public.reservations (
    vehicule_id, client_id, proprietaire_id, date_debut, date_fin,
    statut, source, nom_client_manuel, telephone_client_manuel
  )
  values (
    p_vehicule_id, null, v_proprietaire_id, p_date_debut, p_date_fin,
    'confirmee', 'manuel', p_nom_client, p_telephone_client
  )
  returning id into v_nouvel_id;

  perform public.log_audit('vehicule.blocage_manuel', 'reservations', v_nouvel_id,
    jsonb_build_object('vehicule_id', p_vehicule_id));

  return v_nouvel_id;
end;
$$;

revoke all on function public.bloquer_vehicule(uuid, date, date, text, text) from public;
grant execute on function public.bloquer_vehicule(uuid, date, date, text, text) to authenticated;

create or replace function public.annuler_blocage(p_reservation_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.reservations
    set statut = 'annulee'
    where id = p_reservation_id
      and proprietaire_id = auth.uid()
      and source = 'manuel';

  if not found then
    raise exception 'Blocage introuvable ou action non autorisée';
  end if;

  perform public.log_audit('vehicule.deblocage_manuel', 'reservations', p_reservation_id, '{}'::jsonb);
end;
$$;

revoke all on function public.annuler_blocage(uuid) from public;
grant execute on function public.annuler_blocage(uuid) to authenticated;
