-- ============================================================
-- PlanClic — Fondation SaaS : plans, abonnements, attribution
-- manuelle par l'admin (pas de paiement automatique pour l'instant).
-- ============================================================

-- ------------------------------------------------------------
-- 1. PLANS — les "packs" proposés aux propriétaires
-- ------------------------------------------------------------
create table public.plans (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  description text,
  prix numeric(10, 2) not null default 0,
  periode text not null default 'mensuel' check (periode in ('mensuel', 'annuel')),
  max_vehicules int,                          -- null = illimité
  acces_statistiques boolean not null default false,
  mise_en_avant boolean not null default false, -- priorité dans les résultats de recherche (préparé, pas encore branché à la recherche)
  actif boolean not null default true,        -- un plan désactivé n'est plus proposé aux nouveaux abonnés
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.plans enable row level security;

-- Visible publiquement (page tarifs) si actif, ou par le staff sans condition
create policy "plans_select_public_ou_staff"
  on public.plans for select
  using (actif = true or public.current_role() in ('support', 'admin'));

create policy "plans_admin_insert"
  on public.plans for insert
  with check (public.current_role() = 'admin');

create policy "plans_admin_update"
  on public.plans for update
  using (public.current_role() = 'admin')
  with check (public.current_role() = 'admin');

create policy "plans_admin_delete"
  on public.plans for delete
  using (public.current_role() = 'admin');

grant select on public.plans to anon, authenticated;

-- ------------------------------------------------------------
-- 2. ABONNEMENTS — quel propriétaire a quel plan
-- ------------------------------------------------------------
create table public.abonnements (
  id uuid primary key default gen_random_uuid(),
  proprietaire_id uuid not null references public.proprietaires(id) on delete cascade,
  plan_id uuid not null references public.plans(id),
  date_debut date not null default current_date,
  date_fin date,                              -- null = pas de date de fin fixée
  statut text not null default 'actif' check (statut in ('actif', 'expire', 'annule')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.abonnements enable row level security;

create policy "abonnements_select_owner_ou_staff"
  on public.abonnements for select
  using (
    proprietaire_id = auth.uid()
    or public.current_role() in ('support', 'admin')
  );

-- Aucune policy INSERT/UPDATE directe : toute attribution de plan passe
-- exclusivement par admin_assigner_plan() ci-dessous.

create index idx_abonnements_proprietaire on public.abonnements(proprietaire_id);

-- ------------------------------------------------------------
-- 3. Fonction : plan actuellement actif d'un propriétaire
-- Utilisée à la fois pour l'affichage (page Paramètres) et pour la
-- restriction de fonctionnalités (feature gating) dans les Server
-- Actions — SECURITY DEFINER pour être appelable simplement en RPC.
-- ------------------------------------------------------------
create or replace function public.plan_actuel(p_proprietaire_id uuid)
returns table (
  plan_id uuid,
  nom text,
  max_vehicules int,
  acces_statistiques boolean,
  mise_en_avant boolean,
  date_fin date
)
language sql
stable
security definer
set search_path = public
as $$
  select p.id, p.nom, p.max_vehicules, p.acces_statistiques, p.mise_en_avant, a.date_fin
  from public.abonnements a
  join public.plans p on p.id = a.plan_id
  where a.proprietaire_id = p_proprietaire_id
    and a.statut = 'actif'
  order by a.created_at desc
  limit 1;
$$;

revoke all on function public.plan_actuel(uuid) from public;
grant execute on function public.plan_actuel(uuid) to authenticated;

-- ------------------------------------------------------------
-- 4. Fonction : assigner un plan à un propriétaire (admin/support
-- uniquement). Annule automatiquement l'abonnement actif précédent.
-- ------------------------------------------------------------
create or replace function public.admin_assigner_plan(
  p_proprietaire_id uuid,
  p_plan_id uuid,
  p_date_fin date default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.current_role() not in ('support', 'admin') then
    raise exception 'Action réservée au support';
  end if;

  update public.abonnements
    set statut = 'annule'
    where proprietaire_id = p_proprietaire_id and statut = 'actif';

  insert into public.abonnements (proprietaire_id, plan_id, date_fin)
  values (p_proprietaire_id, p_plan_id, p_date_fin);

  perform public.log_audit('abonnement.assignation', 'abonnements', p_proprietaire_id,
    jsonb_build_object('plan_id', p_plan_id));
end;
$$;

revoke all on function public.admin_assigner_plan(uuid, uuid, date) from public;
grant execute on function public.admin_assigner_plan(uuid, uuid, date) to authenticated;

-- ------------------------------------------------------------
-- 5. Plans de départ (à ajuster librement depuis /admin/plans)
-- ------------------------------------------------------------
insert into public.plans (nom, description, prix, periode, max_vehicules, acces_statistiques, mise_en_avant)
values
  ('Basique', 'Pour démarrer — jusqu''à 3 véhicules', 0, 'mensuel', 3, false, false),
  ('Pro', 'Véhicules illimités, statistiques avancées', 199, 'mensuel', null, true, false),
  ('Premium', 'Tout Pro + mise en avant dans les résultats', 399, 'mensuel', null, true, true);

-- ------------------------------------------------------------
-- 6. Attribution automatique du plan "Basique" (gratuit) à la
-- création d'un compte propriétaire — sans ça, un nouveau compte
-- n'aurait aucun plan tant que l'admin n'intervient pas à la main.
-- ------------------------------------------------------------
create or replace function public.assigner_plan_gratuit_par_defaut()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_plan_basique_id uuid;
begin
  select id into v_plan_basique_id
  from public.plans
  where nom = 'Basique' and actif = true
  limit 1;

  if v_plan_basique_id is not null then
    insert into public.abonnements (proprietaire_id, plan_id)
    values (new.id, v_plan_basique_id);
  end if;

  return new;
end;
$$;

create trigger trg_assigner_plan_gratuit
  after insert on public.proprietaires
  for each row execute function public.assigner_plan_gratuit_par_defaut();
