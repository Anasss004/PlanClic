-- ============================================================
-- PlanClic — Module "Gestion de location + Contrat" (V1)
--
-- Étend le mécanisme de réservation manuelle existant
-- (bloquer_vehicule / source = 'manuel') pour en faire un vrai flux
-- de gestion : numéro de pièce d'identité, photos d'état des lieux,
-- prix, et génération d'un contrat PDF stocké dans un bucket privé.
--
-- V1 : pas de paiement, pas de signature électronique. La colonne
-- signature_url est prévue pour la V2 mais aucune UI n'est construite.
--
-- Doctrine inchangée : toute opération privilégiée passe par une
-- fonction SECURITY DEFINER qui revérifie que l'appelant est bien le
-- propriétaire du véhicule concerné ; aucune écriture directe sur
-- reservations depuis le client ; bucket jamais public.
--
-- À exécuter dans Supabase → SQL Editor APRÈS 14_admin_panel.sql.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Colonnes supplémentaires sur reservations
-- ------------------------------------------------------------
alter table public.reservations
  add column if not exists cin_client_manuel text,          -- numéro CIN/passeport (optionnel, non vérifié)
  add column if not exists photos_etat_vehicule text[] not null default '{}',  -- chemins bucket documents-prives
  add column if not exists contrat_url text,                -- chemin bucket "contrats" du PDF généré
  add column if not exists signature_url text;              -- V2 — non utilisé pour l'instant

-- ------------------------------------------------------------
-- 2. Bucket privé "contrats"
-- Même modèle que "documents-prives" : jamais public, accès limité
-- au propriétaire (préfixe de chemin = son uid) et au staff.
-- Convention de chemin : contrats/{proprietaire_id}/{reservation_id}.pdf
-- ------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('contrats', 'contrats', false)
on conflict (id) do nothing;

drop policy if exists "contrats_lecture_owner_ou_staff" on storage.objects;
create policy "contrats_lecture_owner_ou_staff"
  on storage.objects for select
  using (
    bucket_id = 'contrats'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.current_role() in ('support', 'admin')
    )
  );

drop policy if exists "contrats_ecriture_owner" on storage.objects;
create policy "contrats_ecriture_owner"
  on storage.objects for insert
  with check (
    bucket_id = 'contrats'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Un contrat peut être régénéré (upsert) tant que la location est active.
drop policy if exists "contrats_maj_owner" on storage.objects;
create policy "contrats_maj_owner"
  on storage.objects for update
  using (
    bucket_id = 'contrats'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'contrats'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Comme pour les autres documents privés : ne JAMAIS construire d'URL
-- directe. Toujours une URL signée à courte durée générée côté serveur.

-- ------------------------------------------------------------
-- 3. Création d'une location manuelle (flux "Nouvelle location")
-- Superset de bloquer_vehicule() : ajoute CIN, prix et photos d'état
-- des lieux. bloquer_vehicule() reste en place pour le blocage rapide
-- de dates depuis la fiche véhicule (usage distinct, sans contrat).
-- ------------------------------------------------------------
create or replace function public.creer_location_manuelle(
  p_vehicule_id uuid,
  p_date_debut date,
  p_date_fin date,
  p_nom_client text,
  p_telephone_client text default null,
  p_cin_client text default null,
  p_prix_total numeric default null,
  p_photos_etat text[] default '{}'
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
      cin_client_manuel, photos_etat_vehicule
    )
    values (
      p_vehicule_id, null, v_proprietaire_id, p_date_debut, p_date_fin,
      p_prix_total, 'confirmee', 'manuel', trim(p_nom_client), p_telephone_client,
      nullif(trim(coalesce(p_cin_client, '')), ''), coalesce(p_photos_etat, '{}')
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

revoke all on function public.creer_location_manuelle(uuid, date, date, text, text, text, numeric, text[]) from public;
grant execute on function public.creer_location_manuelle(uuid, date, date, text, text, text, numeric, text[]) to authenticated;

-- ------------------------------------------------------------
-- 4. Ajout de photos d'état des lieux à une location existante
-- (permet de compléter après coup — photo compteur au retour, etc.)
-- ------------------------------------------------------------
create or replace function public.ajouter_photos_etat_location(
  p_reservation_id uuid,
  p_photos text[]
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
  from public.reservations where id = p_reservation_id and source = 'manuel';

  if v_proprietaire_id is null or v_proprietaire_id <> auth.uid() then
    raise exception 'Action non autorisée';
  end if;

  update public.reservations
    set photos_etat_vehicule = coalesce(photos_etat_vehicule, '{}') || coalesce(p_photos, '{}')
    where id = p_reservation_id;

  perform public.log_audit('location.ajout_photos', 'reservations', p_reservation_id, '{}'::jsonb);
end;
$$;

revoke all on function public.ajouter_photos_etat_location(uuid, text[]) from public;
grant execute on function public.ajouter_photos_etat_location(uuid, text[]) to authenticated;

-- ------------------------------------------------------------
-- 5. Enregistrement du chemin du contrat PDF généré
-- ------------------------------------------------------------
create or replace function public.enregistrer_contrat_location(
  p_reservation_id uuid,
  p_contrat_url text
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
  from public.reservations where id = p_reservation_id and source = 'manuel';

  if v_proprietaire_id is null or v_proprietaire_id <> auth.uid() then
    raise exception 'Action non autorisée';
  end if;

  update public.reservations
    set contrat_url = p_contrat_url
    where id = p_reservation_id;

  perform public.log_audit('contrat.generation', 'reservations', p_reservation_id, '{}'::jsonb);
end;
$$;

revoke all on function public.enregistrer_contrat_location(uuid, text) from public;
grant execute on function public.enregistrer_contrat_location(uuid, text) to authenticated;
