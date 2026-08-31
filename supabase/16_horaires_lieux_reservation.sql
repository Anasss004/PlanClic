-- ============================================================
-- PlanClic — Heure et lieu de prise en charge / restitution
--
-- Jusqu'ici une réservation ne portait que des dates. On ajoute
-- l'heure et le lieu (texte libre) pour le début et la fin, et on
-- étend creer_location_manuelle() pour les capturer dès la création
-- d'une location manuelle.
--
-- À exécuter dans Supabase → SQL Editor APRÈS 15_gestion_location_contrat.sql.
-- ============================================================

alter table public.reservations
  add column if not exists heure_debut time,
  add column if not exists lieu_debut  text,
  add column if not exists heure_fin   time,
  add column if not exists lieu_fin    text;

-- ------------------------------------------------------------
-- creer_location_manuelle() — nouvelle signature (12 arguments).
-- On supprime l'ancienne (8 arguments) pour éviter toute ambiguïté
-- de résolution de surcharge lors des appels RPC par nom.
-- ------------------------------------------------------------
drop function if exists public.creer_location_manuelle(uuid, date, date, text, text, text, numeric, text[]);

create or replace function public.creer_location_manuelle(
  p_vehicule_id uuid,
  p_date_debut date,
  p_date_fin date,
  p_nom_client text,
  p_telephone_client text default null,
  p_cin_client text default null,
  p_prix_total numeric default null,
  p_photos_etat text[] default '{}',
  p_heure_debut time default null,
  p_lieu_debut text default null,
  p_heure_fin time default null,
  p_lieu_fin text default null
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

  -- Revérification : l'appelant DOIT être le propriétaire du véhicule.
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

  begin
    insert into public.reservations (
      vehicule_id, client_id, proprietaire_id, date_debut, date_fin,
      prix_total, statut, source, nom_client_manuel, telephone_client_manuel,
      cin_client_manuel, photos_etat_vehicule,
      heure_debut, lieu_debut, heure_fin, lieu_fin
    )
    values (
      p_vehicule_id, null, v_proprietaire_id, p_date_debut, p_date_fin,
      p_prix_total, 'confirmee', 'manuel', trim(p_nom_client), p_telephone_client,
      nullif(trim(coalesce(p_cin_client, '')), ''), coalesce(p_photos_etat, '{}'),
      p_heure_debut, nullif(trim(coalesce(p_lieu_debut, '')), ''),
      p_heure_fin, nullif(trim(coalesce(p_lieu_fin, '')), '')
    )
    returning id into v_nouvel_id;
  exception when exclusion_violation then
    raise exception 'Ces dates chevauchent une réservation confirmée existante pour ce véhicule';
  end;

  perform public.log_audit('location.creation_manuelle', 'reservations', v_nouvel_id,
    jsonb_build_object('vehicule_id', p_vehicule_id, 'avec_photos', coalesce(array_length(p_photos_etat, 1), 0) > 0));

  return v_nouvel_id;
end;
$$;

revoke all on function public.creer_location_manuelle(uuid, date, date, text, text, text, numeric, text[], time, text, time, text) from public;
grant execute on function public.creer_location_manuelle(uuid, date, date, text, text, text, numeric, text[], time, text, time, text) to authenticated;

-- ------------------------------------------------------------
-- maj_details_location() — le propriétaire ajuste heure / lieu (et
-- éventuellement le prix) d'une location manuelle après création.
-- ------------------------------------------------------------
create or replace function public.maj_details_location(
  p_reservation_id uuid,
  p_heure_debut time default null,
  p_lieu_debut text default null,
  p_heure_fin time default null,
  p_lieu_fin text default null
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

  update public.reservations
    set heure_debut = p_heure_debut,
        lieu_debut  = nullif(trim(coalesce(p_lieu_debut, '')), ''),
        heure_fin   = p_heure_fin,
        lieu_fin    = nullif(trim(coalesce(p_lieu_fin, '')), '')
    where id = p_reservation_id;

  perform public.log_audit('location.maj_details', 'reservations', p_reservation_id, '{}'::jsonb);
end;
$$;

revoke all on function public.maj_details_location(uuid, time, text, time, text) from public;
grant execute on function public.maj_details_location(uuid, time, text, time, text) to authenticated;
