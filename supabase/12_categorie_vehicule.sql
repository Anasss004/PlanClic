-- ============================================================
-- PlanClic — Catégorie de véhicule (pour les filtres du calendrier
-- et de la recherche : Économique / Berline Luxe / SUV & 4x4)
-- ============================================================

alter table public.vehicules
  add column if not exists categorie text
  check (categorie in ('economique', 'berline_luxe', 'suv_4x4'));

-- Mise à jour de la vue publique pour inclure la catégorie (utile
-- plus tard si on ajoute ce filtre à la recherche client aussi).
drop view if exists public.vehicules_recherche;

create view public.vehicules_recherche as
  select v.id, v.proprietaire_id, v.type, v.marque, v.modele, v.portes,
         v.places, v.carburant, v.transmission, v.couleur, v.prix_jour,
         v.ville, v.photos, v.km_inclus_jour, v.age_minimum,
         v.anciennete_permis_mois, v.categorie
  from public.vehicules v
  join public.proprietaires p on p.id = v.proprietaire_id
  where v.statut = 'actif'
    and v.deleted_at is null
    and p.statut_verification = 'verifie';

grant select on public.vehicules_recherche to anon, authenticated;
