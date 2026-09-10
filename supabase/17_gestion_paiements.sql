-- ============================================================
-- PlanClic — Module "Gestion des Paiements & Reste à Payer" (V1.1)
--
-- Permet de suivre le montant payé (avance/acompte ou totalité)
-- et d'en déduire le solde restant à régler pour chaque réservation.
-- ============================================================

-- 1. Colonne montant_paye sur public.reservations
alter table public.reservations
  add column if not exists montant_paye numeric default 0;

-- 2. Fonction RPC pour enregistrer ou mettre à jour un paiement
create or replace function public.enregistrer_paiement_location(
  p_reservation_id uuid,
  p_montant_paye numeric
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
  from public.reservations where id = p_reservation_id;

  if v_proprietaire_id is null or v_proprietaire_id <> auth.uid() then
    raise exception 'Action non autorisée';
  end if;

  if p_montant_paye is null or p_montant_paye < 0 then
    raise exception 'Montant payé invalide';
  end if;

  update public.reservations
    set montant_paye = p_montant_paye
    where id = p_reservation_id;

  perform public.log_audit('location.mise_a_jour_paiement', 'reservations', p_reservation_id,
    jsonb_build_object('montant_paye', p_montant_paye));
end;
$$;

revoke all on function public.enregistrer_paiement_location(uuid, numeric) from public;
grant execute on function public.enregistrer_paiement_location(uuid, numeric) to authenticated;

-- 3. Mise à jour de creer_location_manuelle avec support de p_montant_paye
create or replace function public.creer_location_manuelle(
  p_vehicule_id uuid,
  p_date_debut date,
  p_date_fin date,
  p_nom_client text,
  p_telephone_client text default null,
  p_cin_client text default null,
  p_prix_total numeric default null,
  p_photos_etat text[] default '{}',
  p_heure_debut text default null,
  p_lieu_debut text default null,
  p_heure_fin text default null,
  p_lieu_fin text default null,
  p_montant_paye numeric default 0
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
  from public.vehicules where id = p_vehicule_id and deleted_at is null;

  if v_proprietaire_id is null or v_proprietaire_id <> auth.uid() then
    raise exception 'Action non autorisée';
  end if;

  if p_nom_client is null or length(trim(p_nom_client)) = 0 then
    raise exception 'Le nom du client est obligatoire';
  end if;
  if p_date_fin <= p_date_debut then
    raise exception 'La date de fin doit être postérieure à la date de début';
  end if;
  if p_prix_total is not null and p_prix_total < 0 then
    raise exception 'Prix invalide';
  end if;
  if p_montant_paye is not null and p_montant_paye < 0 then
    raise exception 'Montant payé invalide';
  end if;

  begin
    insert into public.reservations (
      vehicule_id, client_id, proprietaire_id, date_debut, date_fin,
      prix_total, montant_paye, statut, source, nom_client_manuel, telephone_client_manuel,
      cin_client_manuel, photos_etat_vehicule, heure_debut, lieu_debut, heure_fin, lieu_fin
    )
    values (
      p_vehicule_id, null, v_proprietaire_id, p_date_debut, p_date_fin,
      p_prix_total, coalesce(p_montant_paye, 0), 'confirmee', 'manuel', trim(p_nom_client), p_telephone_client,
      nullif(trim(coalesce(p_cin_client, '')), ''), coalesce(p_photos_etat, '{}'),
      p_heure_debut, p_lieu_debut, p_heure_fin, p_lieu_fin
    )
    returning id into v_nouvel_id;
  exception when exclusion_violation then
    raise exception 'Ces dates chevauchent une réservation confirmée existante pour ce véhicule';
  end;

  perform public.log_audit('location.creation_manuelle', 'reservations', v_nouvel_id,
    jsonb_build_object('vehicule_id', p_vehicule_id, 'montant_paye', coalesce(p_montant_paye, 0)));

  return v_nouvel_id;
end;
$$;
