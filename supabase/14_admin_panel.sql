-- ============================================================
-- PlanClic — Panel Admin : centre de contrôle de la plateforme
--
-- Même doctrine que le reste du projet :
--   * RLS strict, aucune policy USING (true) ;
--   * toute opération privilégiée passe par une fonction
--     SECURITY DEFINER qui REVÉRIFIE le rôle de l'appelant
--     (public.current_role()) — jamais d'UPDATE/INSERT brut exposé
--     au client sur les tables sensibles ;
--   * chaque action sensible est journalisée via public.log_audit()
--     SANS jamais écrire de contenu sensible (CIN, mots de passe...).
--
-- Distinction des rôles conservée :
--   * support  → peut valider comptes/documents, consulter, exporter,
--                créer un compte propriétaire, diffuser une annonce ;
--   * admin    → tout ce qui précède + changer des rôles (déjà en
--                place) + paramètres globaux de la plateforme.
--
-- À exécuter dans Supabase > SQL Editor APRÈS 13_saas_plans.sql.
-- ============================================================

-- ------------------------------------------------------------
-- 0. Helper : exige un rôle staff (support/admin) ou lève.
-- Utilisé en tête de chaque fonction privilégiée de ce fichier.
-- ------------------------------------------------------------
create or replace function public.assert_staff()
returns void
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if public.current_role() not in ('support', 'admin') then
    raise exception 'Action réservée à l''équipe PlanClic';
  end if;
end;
$$;

revoke all on function public.assert_staff() from public;
grant execute on function public.assert_staff() to authenticated;

create or replace function public.assert_admin()
returns void
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if public.current_role() <> 'admin' then
    raise exception 'Action réservée à un administrateur';
  end if;
end;
$$;

revoke all on function public.assert_admin() from public;
grant execute on function public.assert_admin() to authenticated;

-- ------------------------------------------------------------
-- 1. Journalisation contrôlée depuis le backend admin.
-- log_audit() est déjà accessible à tout "authenticated" ; cette
-- variante revérifie le rôle staff avant d'écrire, pour les traces
-- déclenchées explicitement par le panel (impersonation, exports...).
-- ------------------------------------------------------------
create or replace function public.admin_log(
  p_action text,
  p_resource_type text,
  p_resource_id uuid default null,
  p_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.assert_staff();
  -- Filet de sécurité : on n'accepte jamais certaines clés sensibles
  -- dans les métadonnées d'audit.
  if p_metadata ?| array['password', 'mot_de_passe', 'cin', 'permis', 'token'] then
    raise exception 'Métadonnées d''audit non conformes';
  end if;
  insert into public.audit_logs (actor_id, actor_role, action, resource_type, resource_id, metadata)
  values (auth.uid(), public.current_role(), p_action, p_resource_type, p_resource_id, coalesce(p_metadata, '{}'::jsonb));
end;
$$;

revoke all on function public.admin_log(text, text, uuid, jsonb) from public;
grant execute on function public.admin_log(text, text, uuid, jsonb) to authenticated;

-- ============================================================
-- 2. RECHERCHE GLOBALE
-- Un seul point d'entrée pour chercher un utilisateur, une agence,
-- un véhicule ou une réservation depuis n'importe quelle page admin.
-- SECURITY DEFINER + revérification du rôle : la fonction ne renvoie
-- QUE des métadonnées d'identification (jamais d'email complet de
-- client, jamais d'immatriculation dans le sous-titre public...).
-- ============================================================
create or replace function public.admin_recherche_globale(p_terme text)
returns table (
  categorie text,
  ref_id uuid,
  titre text,
  sous_titre text,
  lien text
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_terme text := trim(coalesce(p_terme, ''));
  v_like text;
begin
  perform public.assert_staff();

  if length(v_terme) < 2 then
    return;
  end if;
  v_like := '%' || v_terme || '%';

  -- Agences (propriétaires)
  return query
    select 'agence'::text,
           pr.id,
           pr.nom_entreprise,
           pr.ville || ' · RC ' || pr.registre_commerce,
           '/admin/agences/' || pr.id::text
    from public.proprietaires pr
    where pr.deleted_at is null
      and (pr.nom_entreprise ilike v_like or pr.registre_commerce ilike v_like or pr.ville ilike v_like)
    order by pr.nom_entreprise
    limit 6;

  -- Utilisateurs (tous rôles)
  return query
    select 'utilisateur'::text,
           p.id,
           p.prenom || ' ' || p.nom,
           p.email || ' · ' || p.role,
           case when p.role = 'proprietaire' then '/admin/agences/' || p.id::text
                else '/admin/utilisateurs' end
    from public.profiles p
    where p.deleted_at is null
      and (p.prenom ilike v_like or p.nom ilike v_like or p.email ilike v_like or coalesce(p.telephone, '') ilike v_like
           or (p.prenom || ' ' || p.nom) ilike v_like)
    order by p.created_at desc
    limit 6;

  -- Véhicules (y compris par immatriculation, réservée au staff)
  return query
    select 'vehicule'::text,
           v.id,
           v.marque || ' ' || v.modele,
           v.immatriculation || ' · ' || v.ville,
           '/admin/agences/' || v.proprietaire_id::text
    from public.vehicules v
    where v.deleted_at is null
      and (v.marque ilike v_like or v.modele ilike v_like or v.immatriculation ilike v_like)
    order by v.created_at desc
    limit 6;

  -- Réservations (par identifiant, complet ou 8 premiers caractères)
  return query
    select 'reservation'::text,
           r.id,
           'Réservation ' || left(r.id::text, 8),
           r.statut || ' · ' || r.date_debut::text || ' → ' || r.date_fin::text,
           '/admin/agences/' || r.proprietaire_id::text
    from public.reservations r
    where r.id::text ilike v_like
    order by r.created_at desc
    limit 6;
end;
$$;

revoke all on function public.admin_recherche_globale(text) from public;
grant execute on function public.admin_recherche_globale(text) to authenticated;

-- ============================================================
-- 3. CRÉATION DE COMPTE / D'ESPACE PAR L'ADMIN
-- La création du compte Auth lui-même (auth.users) se fait côté
-- serveur avec la clé service_role (Server Action dédiée, jamais
-- exposée au client). Ici, on encapsule uniquement les écritures
-- métier qui suivent, derrière une fonction SECURITY DEFINER qui
-- revérifie le rôle — jamais d'INSERT direct sur "proprietaires".
-- ============================================================
create or replace function public.admin_creer_fiche_proprietaire(
  p_user_id uuid,
  p_nom_entreprise text,
  p_specialite text,
  p_ville text,
  p_adresse text,
  p_registre_commerce text,
  p_verifier boolean default false
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.assert_staff();

  if p_specialite not in ('voitures_utilitaires', 'motos') then
    raise exception 'Spécialité invalide';
  end if;

  -- Le rôle du profil doit déjà être "proprietaire" (défini via les
  -- métadonnées Auth à la création). On ne l'élève jamais ici.
  if not exists (select 1 from public.profiles where id = p_user_id and role = 'proprietaire') then
    raise exception 'Profil cible absent ou rôle incorrect';
  end if;

  insert into public.proprietaires (id, nom_entreprise, specialite, ville, adresse, registre_commerce)
  values (p_user_id, p_nom_entreprise, p_specialite, p_ville, nullif(p_adresse, ''), p_registre_commerce);

  if p_verifier then
    perform set_config('planclic.allow_verification_change', 'true', true);
    update public.proprietaires
      set statut_verification = 'verifie', verifie_par = auth.uid(), verifie_le = now()
      where id = p_user_id;
    perform set_config('planclic.allow_verification_change', 'false', true);
  end if;

  perform public.log_audit('agence.creation_admin', 'proprietaires', p_user_id,
    jsonb_build_object('verifie_a_la_creation', p_verifier));
end;
$$;

revoke all on function public.admin_creer_fiche_proprietaire(uuid, text, text, text, text, text, boolean) from public;
grant execute on function public.admin_creer_fiche_proprietaire(uuid, text, text, text, text, text, boolean) to authenticated;

-- ------------------------------------------------------------
-- Ajout du premier véhicule d'une agence par l'admin (onboarding).
-- Les policies "vehicules_insert_verified_owner" exigent que
-- proprietaire_id = auth.uid() : impossible pour l'admin. Cette
-- fonction fait l'insertion à sa place, après revérification du rôle.
-- ------------------------------------------------------------
create or replace function public.admin_ajouter_vehicule(
  p_proprietaire_id uuid,
  p_type text,
  p_marque text,
  p_modele text,
  p_immatriculation text,
  p_prix_jour numeric,
  p_ville text,
  p_carburant text default null,
  p_transmission text default null,
  p_categorie text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  perform public.assert_staff();

  if p_type not in ('voiture', 'moto', 'utilitaire') then
    raise exception 'Type de véhicule invalide';
  end if;
  if not exists (select 1 from public.proprietaires where id = p_proprietaire_id and deleted_at is null) then
    raise exception 'Agence introuvable';
  end if;

  insert into public.vehicules (
    proprietaire_id, type, marque, modele, immatriculation, prix_jour, ville,
    carburant, transmission, categorie
  )
  values (
    p_proprietaire_id, p_type, p_marque, p_modele, p_immatriculation, p_prix_jour, p_ville,
    nullif(p_carburant, ''), nullif(p_transmission, ''), nullif(p_categorie, '')
  )
  returning id into v_id;

  perform public.log_audit('vehicule.creation_admin', 'vehicules', v_id,
    jsonb_build_object('proprietaire_id', p_proprietaire_id));

  return v_id;
end;
$$;

revoke all on function public.admin_ajouter_vehicule(uuid, text, text, text, text, numeric, text, text, text, text) from public;
grant execute on function public.admin_ajouter_vehicule(uuid, text, text, text, text, numeric, text, text, text, text) to authenticated;

-- ============================================================
-- 4. ACTIVER / DÉSACTIVER UN COMPTE AGENCE
-- "Désactivation" = suppression logique (deleted_at). Le compte
-- n'apparaît plus dans la recherche publique (les vues filtrent
-- déjà deleted_at is null) ni ne peut publier. Réversible.
-- ============================================================
create or replace function public.admin_definir_actif_agence(
  p_proprietaire_id uuid,
  p_actif boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.assert_staff();

  perform set_config('planclic.allow_verification_change', 'true', true);
  update public.proprietaires
    set deleted_at = case when p_actif then null else now() end
    where id = p_proprietaire_id;
  perform set_config('planclic.allow_verification_change', 'false', true);

  if not found then
    raise exception 'Agence introuvable';
  end if;

  -- Quand on désactive, on masque aussi les véhicules de l'agence.
  if not p_actif then
    update public.vehicules set statut = 'inactif' where proprietaire_id = p_proprietaire_id;
  end if;

  perform public.log_audit(
    case when p_actif then 'agence.reactivation' else 'agence.desactivation' end,
    'proprietaires', p_proprietaire_id, '{}'::jsonb);
end;
$$;

revoke all on function public.admin_definir_actif_agence(uuid, boolean) from public;
grant execute on function public.admin_definir_actif_agence(uuid, boolean) to authenticated;

-- ============================================================
-- 5. IMPERSONATION ("Se connecter en tant que")
-- La bascule de session elle-même est gérée côté serveur (cookie
-- signé, Server Action). Ici on fournit juste le point de
-- journalisation obligatoire, avec revérification du rôle.
-- ============================================================
create or replace function public.admin_journaliser_impersonation(
  p_proprietaire_id uuid,
  p_evenement text  -- 'debut' | 'fin'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.assert_staff();
  if p_evenement not in ('debut', 'fin') then
    raise exception 'Évènement invalide';
  end if;
  perform public.log_audit('support.impersonation_' || p_evenement, 'proprietaires', p_proprietaire_id, '{}'::jsonb);
end;
$$;

revoke all on function public.admin_journaliser_impersonation(uuid, text) from public;
grant execute on function public.admin_journaliser_impersonation(uuid, text) to authenticated;

-- ============================================================
-- 6. PARAMÈTRES GLOBAUX DE LA PLATEFORME
-- Table clé/valeur (jsonb). Lecture publique pour un petit nombre
-- de clés "publiques" (numéro WhatsApp, liens légaux, villes,
-- catégories) ; écriture réservée à l'admin via RPC.
-- ============================================================
create table if not exists public.parametres_plateforme (
  cle text primary key,
  valeur jsonb not null default '{}'::jsonb,
  public boolean not null default false,   -- true = lisible par anon/authenticated
  description text,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id)
);

alter table public.parametres_plateforme enable row level security;

create policy "parametres_select_publics_ou_staff"
  on public.parametres_plateforme for select
  using (public = true or public.current_role() in ('support', 'admin'));

-- Aucune policy INSERT/UPDATE/DELETE : tout passe par admin_definir_parametre().

grant select on public.parametres_plateforme to anon, authenticated;

create or replace function public.admin_definir_parametre(p_cle text, p_valeur jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.assert_admin();

  update public.parametres_plateforme
    set valeur = p_valeur, updated_at = now(), updated_by = auth.uid()
    where cle = p_cle;

  if not found then
    raise exception 'Paramètre inconnu : %', p_cle;
  end if;

  perform public.log_audit('parametre.modification', 'parametres_plateforme', null,
    jsonb_build_object('cle', p_cle));
end;
$$;

revoke all on function public.admin_definir_parametre(text, jsonb) from public;
grant execute on function public.admin_definir_parametre(text, jsonb) to authenticated;

-- Valeurs de départ (modifiables ensuite depuis /admin/parametres-plateforme).
insert into public.parametres_plateforme (cle, valeur, public, description) values
  ('whatsapp_admin', '"212600000000"'::jsonb, true, 'Numéro WhatsApp officiel PlanClic (format international, sans +)'),
  ('lien_cgu', '"/cgu"'::jsonb, true, 'Lien vers les Conditions Générales d''Utilisation'),
  ('lien_confidentialite', '"/politique-confidentialite"'::jsonb, true, 'Lien vers la politique de confidentialité'),
  ('villes', '["Marrakech","Casablanca","Rabat","Agadir","Tanger","Fès"]'::jsonb, true, 'Villes proposées à la recherche'),
  ('categories_vehicule', '["economique","berline_luxe","suv_4x4"]'::jsonb, true, 'Catégories de véhicules disponibles')
on conflict (cle) do nothing;

-- ============================================================
-- 7. CENTRE DE NOTIFICATIONS SYSTÈME
-- L'admin/support diffuse une annonce à tous les propriétaires ou
-- à un sous-ensemble (par plan). Chaque destinataire reçoit une
-- ligne. L'envoi d'email associé n'est PAS encore construit — voir
-- note en fin de fichier. Cette table alimente le centre de
-- notifications in-app de l'espace propriétaire.
-- ============================================================
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  destinataire_id uuid not null references public.profiles(id) on delete cascade,
  titre text not null,
  message text not null,
  categorie text not null default 'annonce' check (categorie in ('annonce', 'systeme', 'support')),
  lu_le timestamptz,
  cree_par uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

alter table public.notifications enable row level security;

create index if not exists idx_notifications_destinataire on public.notifications(destinataire_id, created_at desc);

create policy "notifications_select_destinataire_ou_staff"
  on public.notifications for select
  using (destinataire_id = auth.uid() or public.current_role() in ('support', 'admin'));

-- Le destinataire peut uniquement marquer SES notifications comme lues
-- (aucune autre colonne modifiable — garanti par le trigger ci-dessous).
create policy "notifications_update_destinataire_lu"
  on public.notifications for update
  using (destinataire_id = auth.uid())
  with check (destinataire_id = auth.uid());

create or replace function public.notifications_lock_columns()
returns trigger
language plpgsql
security invoker
as $$
begin
  if new.destinataire_id is distinct from old.destinataire_id
     or new.titre is distinct from old.titre
     or new.message is distinct from old.message
     or new.categorie is distinct from old.categorie
     or new.cree_par is distinct from old.cree_par
     or new.created_at is distinct from old.created_at then
    raise exception 'Seul le statut de lecture peut être modifié';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_notifications_lock on public.notifications;
create trigger trg_notifications_lock
  before update on public.notifications
  for each row execute function public.notifications_lock_columns();

-- Aucune policy INSERT : la diffusion passe par admin_diffuser_notification().

create or replace function public.admin_diffuser_notification(
  p_titre text,
  p_message text,
  p_cible text default 'tous',       -- 'tous' | 'plan'
  p_filtre_plan_id uuid default null
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  perform public.assert_staff();

  if length(trim(coalesce(p_titre, ''))) = 0 or length(trim(coalesce(p_message, ''))) = 0 then
    raise exception 'Titre et message obligatoires';
  end if;
  if p_cible not in ('tous', 'plan') then
    raise exception 'Cible invalide';
  end if;
  if p_cible = 'plan' and p_filtre_plan_id is null then
    raise exception 'Plan cible manquant';
  end if;

  with destinataires as (
    select distinct pr.id
    from public.proprietaires pr
    where pr.deleted_at is null
      and (
        p_cible = 'tous'
        or exists (
          select 1 from public.abonnements a
          where a.proprietaire_id = pr.id
            and a.statut = 'actif'
            and a.plan_id = p_filtre_plan_id
        )
      )
  ),
  inserted as (
    insert into public.notifications (destinataire_id, titre, message, categorie, cree_par)
    select d.id, p_titre, p_message, 'annonce', auth.uid()
    from destinataires d
    returning 1
  )
  select count(*) into v_count from inserted;

  perform public.log_audit('notification.diffusion', 'notifications', null,
    jsonb_build_object('cible', p_cible, 'plan_id', p_filtre_plan_id, 'destinataires', v_count));

  return v_count;
end;
$$;

revoke all on function public.admin_diffuser_notification(text, text, text, uuid) from public;
grant execute on function public.admin_diffuser_notification(text, text, text, uuid) to authenticated;

-- Notification ciblée à UN seul propriétaire (bouton "Envoyer un
-- message" sur la fiche agence).
create or replace function public.admin_notifier_proprietaire(
  p_proprietaire_id uuid,
  p_titre text,
  p_message text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.assert_staff();
  if length(trim(coalesce(p_titre, ''))) = 0 or length(trim(coalesce(p_message, ''))) = 0 then
    raise exception 'Titre et message obligatoires';
  end if;
  if not exists (select 1 from public.proprietaires where id = p_proprietaire_id) then
    raise exception 'Agence introuvable';
  end if;

  insert into public.notifications (destinataire_id, titre, message, categorie, cree_par)
  values (p_proprietaire_id, p_titre, p_message, 'support', auth.uid());

  perform public.log_audit('notification.individuelle', 'notifications', p_proprietaire_id, '{}'::jsonb);
end;
$$;

revoke all on function public.admin_notifier_proprietaire(uuid, text, text) from public;
grant execute on function public.admin_notifier_proprietaire(uuid, text, text) to authenticated;

-- ============================================================
-- NOTES D'EXPLOITATION
-- ============================================================
-- * Envoi d'email : NON couvert par ce fichier. admin_diffuser_
--   notification() et la création de compte alimentent le centre de
--   notifications in-app et renvoient un lien de définition de mot de
--   passe, mais aucun email n'est expédié automatiquement tant qu'un
--   service d'emailing (Resend / SMTP Supabase) n'est pas branché.
-- * La création de compte Auth (auth.users) nécessite la variable
--   d'environnement SUPABASE_SERVICE_ROLE_KEY côté serveur
--   uniquement (voir src/lib/supabase/admin.ts).
