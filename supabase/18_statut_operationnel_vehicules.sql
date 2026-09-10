-- ============================================================
-- PlanClic — Module "Statut Opérationnel Véhicules" (V1.2)
--
-- Permet aux propriétaires d'agences de gérer en 1 clic l'état réel
-- de chaque véhicule de leur flotte :
--   - disponible (En agence, prêt à louer)
--   - livree (En location avec le client)
--   - en_retard (Restitution dépassée)
--   - maintenance (Au garage / entretien / vidange)
-- ============================================================

-- 1. Colonne statut_operationnel sur public.vehicules
alter table public.vehicules
  add column if not exists statut_operationnel text default 'disponible';

-- 2. Fonction RPC SECURITY DEFINER pour changer le statut opérationnel et maj kilométrage
create or replace function public.changer_statut_operationnel_vehicule(
  p_vehicule_id uuid,
  p_statut text,
  p_kilometrage numeric default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_proprietaire_id uuid;
begin
  select proprietaire_id into v_proprietaire_id
  from public.vehicules where id = p_vehicule_id and deleted_at is null;

  if v_proprietaire_id is null or v_proprietaire_id <> auth.uid() then
    raise exception 'Action non autorisée';
  end if;

  if p_statut not in ('disponible', 'livree', 'en_retard', 'maintenance') then
    raise exception 'Statut opérationnel invalide';
  end if;

  update public.vehicules
    set statut_operationnel = p_statut,
        kilometrage_actuel = coalesce(p_kilometrage, kilometrage_actuel)
    where id = p_vehicule_id;

  perform public.log_audit('vehicule.changement_statut_operationnel', 'vehicules', p_vehicule_id,
    jsonb_build_object('nouveau_statut', p_statut, 'kilometrage', p_kilometrage));
end;
$$;

revoke all on function public.changer_statut_operationnel_vehicule(uuid, text, numeric) from public;
grant execute on function public.changer_statut_operationnel_vehicule(uuid, text, numeric) to authenticated;
