-- ============================================================
-- 21_fix_creer_location_manuelle.sql
--
-- CORRECTIF : "Nouvelle location" échouait systématiquement.
--
-- CAUSE
-- La migration 16 crée les colonnes horaires en `time` :
--     alter table public.reservations
--       add column if not exists heure_debut time,
--       add column if not exists heure_fin   time;
--
-- La migration 17 redéclare creer_location_manuelle() avec ces mêmes
-- paramètres en `text` (p_heure_debut text, p_heure_fin text) et les insère
-- directement dans les colonnes `time`, sans conversion :
--     insert into public.reservations (..., heure_debut, ..., heure_fin, ...)
--     values                          (..., p_heure_debut, ..., p_heure_fin, ...)
--
-- PostgreSQL refuse d'affecter une expression de type `text` à une colonne
-- d'un autre type : « column "heure_debut" is of type time without time zone
-- but expression is of type text ». L'erreur est levée à la planification de
-- l'INSERT, donc à CHAQUE appel — y compris quand les deux paramètres valent
-- NULL, puisque c'est le type déclaré qui est en cause, pas la valeur.
--
-- L'exception n'était rattrapée par rien : le bloc `exception when
-- exclusion_violation` ne couvre que les vrais chevauchements. La fonction
-- remontait donc une erreur, l'action serveur redirigeait vers
-- ?erreur=creation, dont le libellé accusait à tort un chevauchement de
-- dates. D'où un message trompeur sur un véhicule sans aucune réservation.
--
-- CORRECTIF
-- Conversion explicite en `time`, avec nullif() pour traiter la chaîne vide
-- comme une absence de valeur ('' n'est pas un `time` valide et lèverait
-- « invalid input syntax for type time »).
--
-- La signature reste identique (13 arguments, horaires en `text`) : c'est
-- bien un `create or replace` en place, aucune nouvelle surcharge n'est
-- créée et le code applicatif n'a pas à changer.
--
-- Vérifié sur la base : les colonnes sont bien en `time without time zone`
-- et la fonction exposée déclare bien ses paramètres horaires en `text`.
-- ============================================================

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
  v_heure_debut time;
  v_heure_fin   time;
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

  -- Conversion explicite text -> time (cause du bug corrigé ici).
  -- nullif() neutralise la chaîne vide, qui n'est pas un `time` valide.
  begin
    v_heure_debut := nullif(trim(coalesce(p_heure_debut, '')), '')::time;
    v_heure_fin   := nullif(trim(coalesce(p_heure_fin,   '')), '')::time;
  exception when invalid_datetime_format or datetime_field_overflow then
    raise exception 'Heure invalide : utilise le format HH:MM';
  end;

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
      v_heure_debut, p_lieu_debut, v_heure_fin, p_lieu_fin
    )
    returning id into v_nouvel_id;
  exception when exclusion_violation then
    raise exception 'Ces dates chevauchent une réservation confirmée existante pour ce véhicule'
      using errcode = 'exclusion_violation';
  end;

  perform public.log_audit('location.creation_manuelle', 'reservations', v_nouvel_id,
    jsonb_build_object('vehicule_id', p_vehicule_id, 'montant_paye', coalesce(p_montant_paye, 0)));

  return v_nouvel_id;
end;
$$;

-- Les droits suivent la signature : celle-ci étant inchangée, les grants
-- posés précédemment restent valables. On les repose malgré tout, la
-- migration 17 ayant créé la fonction sans jamais les déclarer.
revoke all on function public.creer_location_manuelle(
  uuid, date, date, text, text, text, numeric, text[], text, text, text, text, numeric
) from public;

grant execute on function public.creer_location_manuelle(
  uuid, date, date, text, text, text, numeric, text[], text, text, text, text, numeric
) to authenticated;

-- ============================================================
-- CONTRÔLE AVANT / APRÈS
--
-- Confirme la cause (à lancer avant d'appliquer ce fichier) : doit montrer
-- heure_debut/heure_fin en "time without time zone" côté colonne, et "text"
-- côté paramètre de la fonction.
--
-- select column_name, data_type
-- from information_schema.columns
-- where table_schema = 'public' and table_name = 'reservations'
--   and column_name in ('heure_debut', 'heure_fin');
--
-- select p.proname, pg_get_function_arguments(p.oid)
-- from pg_proc p join pg_namespace n on n.oid = p.pronamespace
-- where n.nspname = 'public' and p.proname = 'creer_location_manuelle';
--
-- La seconde requête doit renvoyer UNE seule ligne. Si elle en renvoie
-- plusieurs, plusieurs surcharges coexistent et il faut supprimer les
-- anciennes, sans quoi PostgREST ne saura pas laquelle appeler.
-- ============================================================
