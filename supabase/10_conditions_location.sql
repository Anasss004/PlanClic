-- ============================================================
-- PlanClic — Champs optionnels "conditions de location"
-- (km/jour inclus, âge minimum, ancienneté du permis) + mise à
-- jour de la vue publique de recherche pour les inclure.
-- ============================================================

alter table public.vehicules
  add column if not exists km_inclus_jour int,
  add column if not exists age_minimum int,
  add column if not exists anciennete_permis_mois int;

-- On recrée la vue pour inclure ces nouvelles colonnes (toujours
-- sans immatriculation, toujours limitée aux véhicules actifs
-- d'agences vérifiées).
drop view if exists public.vehicules_recherche;

create view public.vehicules_recherche as
  select v.id, v.proprietaire_id, v.type, v.marque, v.modele, v.portes,
         v.places, v.carburant, v.transmission, v.couleur, v.prix_jour,
         v.ville, v.photos, v.km_inclus_jour, v.age_minimum,
         v.anciennete_permis_mois
  from public.vehicules v
  join public.proprietaires p on p.id = v.proprietaire_id
  where v.statut = 'actif'
    and v.deleted_at is null
    and p.statut_verification = 'verifie';

grant select on public.vehicules_recherche to anon, authenticated;
