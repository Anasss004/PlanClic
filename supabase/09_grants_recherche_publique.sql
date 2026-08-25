-- ============================================================
-- PlanClic — Autoriser la lecture publique des vues de recherche
-- Ces vues (vehicules_recherche, proprietaires_public) sont conçues
-- pour être visibles par tout le monde, y compris les visiteurs non
-- connectés. Elles filtrent déjà ce qui doit rester privé
-- (immatriculation exclue, uniquement véhicules actifs d'agences
-- vérifiées) — il manquait juste l'autorisation de lecture explicite.
-- ============================================================

grant select on public.vehicules_recherche to anon, authenticated;
grant select on public.proprietaires_public to anon, authenticated;
