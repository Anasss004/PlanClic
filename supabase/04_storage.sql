-- ============================================================
-- PlanClic — Storage sécurisé (04/04)
-- Un seul bucket est public (photos des véhicules, non sensibles).
-- Tout le reste (documents d'identité, signatures, contrats,
-- photos d'état des lieux) est privé, avec policies sur
-- storage.objects reflétant les mêmes règles que la table "documents".
--
-- CONVENTION DE CHEMIN OBLIGATOIRE (jamais de nom/CIN/tel/email) :
--   documents-prives/{owner_id}/{uuid_aleatoire}.{ext}
-- Le owner_id en tête de chemin permet des policies simples ET sûres ;
-- il n'est pas "secret" en soi mais couplé à auth.uid() dans la
-- policy, donc un utilisateur ne peut pas deviner/modifier le chemin
-- d'un autre pour y accéder.
-- ============================================================

insert into storage.buckets (id, name, public)
values
  ('photos-vehicules', 'photos-vehicules', true),
  ('documents-prives', 'documents-prives', false)
on conflict (id) do nothing;

-- Note : RLS est déjà activé par défaut par Supabase sur storage.objects,
-- inutile (et interdit sans droits superadmin) de le refaire soi-même.

-- ------------------------------------------------------------
-- Bucket public "photos-vehicules" : lecture publique (nécessaire
-- pour l'affichage des annonces), écriture réservée aux propriétaires
-- vérifiés sur leur propre dossier.
-- ------------------------------------------------------------
create policy "photos_vehicules_lecture_publique"
  on storage.objects for select
  using (bucket_id = 'photos-vehicules');

create policy "photos_vehicules_ecriture_proprietaire_verifie"
  on storage.objects for insert
  with check (
    bucket_id = 'photos-vehicules'
    and (storage.foldername(name))[1] = auth.uid()::text
    and exists (
      select 1 from public.proprietaires
      where id = auth.uid() and statut_verification = 'verifie'
    )
  );

-- ------------------------------------------------------------
-- Bucket privé "documents-prives" : CIN, permis, RC, signatures,
-- contrats, photos d'état des lieux. Aucun accès public.
-- ------------------------------------------------------------
create policy "documents_prives_lecture_owner_ou_autorise"
  on storage.objects for select
  using (
    bucket_id = 'documents-prives'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.current_role() in ('support', 'admin')
      or exists (
        select 1 from public.documents d
        join public.reservations r on r.id = d.reservation_id
        where d.storage_path = storage.objects.name
          and d.type_document in ('cin', 'permis')
          and r.proprietaire_id = auth.uid()
          and r.client_id::text = (storage.foldername(storage.objects.name))[1]
      )
    )
  );

create policy "documents_prives_ecriture_owner"
  on storage.objects for insert
  with check (
    bucket_id = 'documents-prives'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Aucune policy UPDATE/DELETE sur les objets de ce bucket pour les
-- utilisateurs authentifiés : un document uploadé est immuable côté
-- fichier. Une correction = nouvel upload + ancien document marqué
-- deleted_at dans la table "documents".

-- ============================================================
-- IMPORTANT — Accès temporaire aux documents privés
-- ============================================================
-- Le point ci-dessus autorise la LECTURE via l'API si la policy est
-- vraie, mais dans l'application, ne jamais construire d'URL directe
-- vers storage.objects. Toujours générer une URL signée à courte
-- durée (ex: 60-120 secondes) côté serveur :
--
--   const { data, error } = await supabase.storage
--     .from('documents-prives')
--     .createSignedUrl(storagePath, 90) // 90 secondes
--
-- Cet appel doit se faire depuis une Server Action (jamais depuis le
-- navigateur avec la clé anon pour ce type de fichier), et doit être
-- précédé d'un appel à log_audit('document.view', ...) pour tracer
-- la consultation, conformément à la règle d'audit.
