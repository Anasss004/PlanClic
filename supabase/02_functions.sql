-- ============================================================
-- PlanClic — Schéma sécurisé V1 (02/03 — Fonctions)
-- Fonctions utilitaires pour les policies RLS, et fonctions
-- privilégiées (SECURITY DEFINER) pour les opérations sensibles.
-- Toute fonction SECURITY DEFINER a un search_path fixé et un accès
-- restreint (REVOKE puis GRANT ciblé), conformément à la règle 13.
-- ============================================================

-- ------------------------------------------------------------
-- Rôle de l'utilisateur courant — utilisé dans les policies RLS.
-- SECURITY DEFINER pour éviter la récursion RLS (une policy sur
-- "profiles" qui interrogerait "profiles" en RLS invoker créerait
-- une boucle). Accès restreint à SELECT du rôle uniquement.
-- ------------------------------------------------------------
create or replace function public.current_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid() and deleted_at is null;
$$;

revoke all on function public.current_role() from public;
grant execute on function public.current_role() to authenticated;

-- ------------------------------------------------------------
-- Vérifie qu'un propriétaire a une relation de réservation légitime
-- avec un client (nécessaire pour autoriser un propriétaire à voir
-- le permis/CIN d'un client — uniquement s'il y a réservation).
-- ------------------------------------------------------------
create or replace function public.has_active_relationship(p_proprietaire_id uuid, p_client_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.reservations
    where proprietaire_id = p_proprietaire_id
      and client_id = p_client_id
      and statut in ('en_attente', 'confirmee', 'terminee')
      and deleted_at is null
  );
$$;

revoke all on function public.has_active_relationship(uuid, uuid) from public;
grant execute on function public.has_active_relationship(uuid, uuid) to authenticated;

-- ------------------------------------------------------------
-- Journalisation centralisée. Jamais appelée directement par un
-- utilisateur : uniquement depuis d'autres fonctions SECURITY DEFINER
-- ou depuis le backend (Server Actions avec service_role).
-- ------------------------------------------------------------
create or replace function public.log_audit(
  p_action text,
  p_resource_type text,
  p_resource_id uuid,
  p_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.audit_logs (actor_id, actor_role, action, resource_type, resource_id, metadata)
  values (auth.uid(), public.current_role(), p_action, p_resource_type, p_resource_id, p_metadata);
end;
$$;

revoke all on function public.log_audit(text, text, uuid, jsonb) from public;
grant execute on function public.log_audit(text, text, uuid, jsonb) to authenticated;

-- ------------------------------------------------------------
-- Changement de rôle — RÉSERVÉ à admin. Seul point d'entrée possible
-- pour modifier profiles.role (le trigger bloque tout le reste).
-- ------------------------------------------------------------
create or replace function public.admin_set_role(p_user_id uuid, p_new_role text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.current_role() <> 'admin' then
    raise exception 'Seul un administrateur peut modifier un rôle';
  end if;
  if p_new_role not in ('client', 'proprietaire', 'support', 'admin') then
    raise exception 'Rôle invalide';
  end if;

  perform set_config('planclic.allow_role_change', 'true', true);
  update public.profiles set role = p_new_role where id = p_user_id;
  perform set_config('planclic.allow_role_change', 'false', true);

  perform public.log_audit('profile.role_change', 'profiles', p_user_id,
    jsonb_build_object('new_role', p_new_role));
end;
$$;

revoke all on function public.admin_set_role(uuid, text) from public;
grant execute on function public.admin_set_role(uuid, text) to authenticated;

-- ------------------------------------------------------------
-- Validation/rejet d'un compte propriétaire — RÉSERVÉ à support/admin.
-- Seul point d'entrée pour modifier statut_verification.
-- ------------------------------------------------------------
create or replace function public.verifier_proprietaire(p_proprietaire_id uuid, p_decision text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.current_role() not in ('support', 'admin') then
    raise exception 'Action réservée au support';
  end if;
  if p_decision not in ('verifie', 'rejete') then
    raise exception 'Décision invalide';
  end if;

  perform set_config('planclic.allow_verification_change', 'true', true);
  update public.proprietaires
    set statut_verification = p_decision, verifie_par = auth.uid(), verifie_le = now()
    where id = p_proprietaire_id;
  perform set_config('planclic.allow_verification_change', 'false', true);

  perform public.log_audit('proprietaire.verification', 'proprietaires', p_proprietaire_id,
    jsonb_build_object('decision', p_decision));
end;
$$;

revoke all on function public.verifier_proprietaire(uuid, text) from public;
grant execute on function public.verifier_proprietaire(uuid, text) to authenticated;

-- ------------------------------------------------------------
-- Validation/rejet d'un document — RÉSERVÉ à support/admin.
-- Journalise l'action sans jamais logger le contenu du document.
-- ------------------------------------------------------------
create or replace function public.valider_document(p_document_id uuid, p_decision text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.current_role() not in ('support', 'admin') then
    raise exception 'Action réservée au support';
  end if;
  if p_decision not in ('valide', 'rejete') then
    raise exception 'Décision invalide';
  end if;

  update public.documents set statut = p_decision where id = p_document_id;

  perform public.log_audit('document.validation', 'documents', p_document_id,
    jsonb_build_object('decision', p_decision));
end;
$$;

revoke all on function public.valider_document(uuid, text) from public;
grant execute on function public.valider_document(uuid, text) to authenticated;

-- ------------------------------------------------------------
-- Changement de statut de réservation — encapsule les règles métier
-- (qui a le droit de passer à quel statut) plutôt que de laisser un
-- UPDATE direct sur la table, plus facile à auditer et à restreindre.
-- ------------------------------------------------------------
create or replace function public.changer_statut_reservation(p_reservation_id uuid, p_nouveau_statut text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reservation record;
begin
  select * into v_reservation from public.reservations where id = p_reservation_id;
  if v_reservation is null then
    raise exception 'Réservation introuvable';
  end if;

  -- Le propriétaire peut confirmer/refuser une demande en attente
  if p_nouveau_statut in ('confirmee', 'refusee') then
    if v_reservation.proprietaire_id <> auth.uid() then
      raise exception 'Action non autorisée';
    end if;
    if v_reservation.statut <> 'en_attente' then
      raise exception 'Cette réservation ne peut plus être modifiée';
    end if;

  -- Le client peut annuler sa propre demande tant qu'elle n'est pas confirmée
  elsif p_nouveau_statut = 'annulee' then
    if v_reservation.client_id <> auth.uid() then
      raise exception 'Action non autorisée';
    end if;
    if v_reservation.statut not in ('en_attente') then
      raise exception 'Cette réservation ne peut plus être annulée';
    end if;

  -- Terminer une location : réservé au propriétaire concerné
  elsif p_nouveau_statut = 'terminee' then
    if v_reservation.proprietaire_id <> auth.uid() then
      raise exception 'Action non autorisée';
    end if;
    if v_reservation.statut <> 'confirmee' then
      raise exception 'Statut invalide pour cette transition';
    end if;

  else
    raise exception 'Transition de statut non autorisée';
  end if;

  update public.reservations set statut = p_nouveau_statut where id = p_reservation_id;

  perform public.log_audit('reservation.status_change', 'reservations', p_reservation_id,
    jsonb_build_object('nouveau_statut', p_nouveau_statut));
end;
$$;

revoke all on function public.changer_statut_reservation(uuid, text) from public;
grant execute on function public.changer_statut_reservation(uuid, text) to authenticated;
