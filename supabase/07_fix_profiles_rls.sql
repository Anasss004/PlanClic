-- ============================================================
-- PlanClic — Correctif RLS : un propriétaire doit pouvoir voir le
-- nom/prénom d'un client avec qui il a une réservation (nécessaire
-- pour afficher "qui" a une réservation, une amende, etc.)
--
-- Ceci ne donne PAS accès aux documents (CIN/permis) — ça reste
-- protégé séparément par la policy sur la table "documents".
-- Seuls prenom/nom (non sensibles) deviennent visibles, uniquement
-- s'il existe une réservation liant les deux comptes.
-- ============================================================

create policy "profiles_select_client_by_proprietaire_avec_reservation"
  on public.profiles for select
  using (
    exists (
      select 1 from public.reservations r
      where r.client_id = profiles.id
        and r.proprietaire_id = auth.uid()
    )
  );
