-- ============================================================
-- PlanClic — Module "Restitution et Retour de Véhicule" (V1.3)
--
-- Permet aux propriétaires d'agences d'enregistrer la restitution
-- complète d'un véhicule retourné par le client :
--   - Remise automatique du véhicule en état 'disponible' (ou 'maintenance')
--   - Mise à jour du kilométrage de retour
--   - Clôture de la réservation (statut 'terminee')
--   - Règlement du solde restant et suivi de la caution
-- ============================================================

create or replace function public.enregistrer_retour_vehicule(
  p_vehicule_id uuid,
  p_reservation_id uuid default null,
  p_kilometrage_retour numeric default null,
  p_niveau_carburant text default null,
  p_solde_regle boolean default false,
  p_caution_restituee boolean default true,
  p_statut_apres_retour text default 'disponible'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_proprietaire_id uuid;
begin
  -- Vérification propriétaire
  select proprietaire_id into v_proprietaire_id
  from public.vehicules where id = p_vehicule_id and deleted_at is null;

  if v_proprietaire_id is null or v_proprietaire_id <> auth.uid() then
    raise exception 'Action non autorisée';
  end if;

  if p_statut_apres_retour not in ('disponible', 'maintenance') then
    p_statut_apres_retour := 'disponible';
  end if;

  -- 1. Mise à jour du statut opérationnel et du kilométrage du véhicule
  update public.vehicules
    set statut_operationnel = p_statut_apres_retour,
        kilometrage_actuel = coalesce(p_kilometrage_retour, kilometrage_actuel)
    where id = p_vehicule_id;

  -- 2. Si une réservation est fournie, clôturer la location
  if p_reservation_id is not null then
    update public.reservations
      set statut = 'terminee',
          montant_paye = case 
            when p_solde_regle and prix_total is not null then prix_total 
            else montant_paye 
          end
      where id = p_reservation_id and proprietaire_id = auth.uid();
  end if;

  -- 3. Journal d'audit
  perform public.log_audit(
    'vehicule.retour_enregistre', 
    'vehicules', 
    p_vehicule_id,
    jsonb_build_object(
      'kilometrage_retour', p_kilometrage_retour,
      'niveau_carburant', p_niveau_carburant,
      'reservation_id', p_reservation_id,
      'solde_regle', p_solde_regle,
      'caution_restituee', p_caution_restituee,
      'statut_apres_retour', p_statut_apres_retour
    )
  );
end;
$$;

revoke all on function public.enregistrer_retour_vehicule(uuid, uuid, numeric, text, boolean, boolean, text) from public;
grant execute on function public.enregistrer_retour_vehicule(uuid, uuid, numeric, text, boolean, boolean, text) to authenticated;
