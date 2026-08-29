# Panel Admin — Contrôle total de la plateforme

Ce document récapitule les modules ajoutés à l'espace `/admin/*`, les
migrations à exécuter et les limites techniques connues.

## 1. Migrations Supabase à exécuter (dans l'ordre)

| Ordre | Fichier | Contenu |
|------|---------|---------|
| 1 | `supabase/14_admin_panel.sql` | **Unique migration à lancer.** Fonctions `SECURITY DEFINER` (recherche globale, création de fiche agence, ajout véhicule admin, activation/désactivation, journalisation impersonation, paramètres, notifications), tables `parametres_plateforme` et `notifications` + RLS. |

À exécuter dans **Supabase → SQL Editor**, après `13_saas_plans.sql`.
Le fichier est idempotent sur les tables (`create table if not exists`,
`on conflict do nothing`) mais **pas** sur les `create policy` : si vous
relancez, supprimez d'abord les policies existantes ou ignorez les
erreurs « already exists ».

## 2. Variable d'environnement requise

La **création de comptes / d'espaces par l'admin** (modules 3 & 4)
utilise `auth.admin.createUser`, qui nécessite la clé service_role :

```
SUPABASE_SERVICE_ROLE_KEY=...
```

À ajouter dans `.env.local` (jamais préfixée `NEXT_PUBLIC_`). Tant
qu'elle est absente, l'assistant `/admin/creer-espace` s'affiche mais le
bouton « Créer l'espace » reste désactivé avec un message explicite.
Elle n'est lue que dans `src/lib/supabase/admin.ts`, exclusivement
côté serveur, dans la Server Action `creerEspaceProprietaire`.

## 3. Modules livrés

| # | Module | Pages / points d'entrée |
|---|--------|-------------------------|
| — | Vue d'ensemble enrichie | `/admin/dashboard` (évolution 6 mois, agences par plan, entonnoir de conversion, top 5 agences/véhicules, activité récente) |
| 1 | Fiche détaillée par agence | `/admin/agences/[id]` — liée depuis Utilisateurs / Véhicules / Abonnements |
| 2 | Recherche globale | champ dans la sidebar admin (desktop + mobile) |
| 3 | Création de compte par l'admin | intégrée à l'assistant ci-dessous |
| 4 | Création d'espace (onboarding) | `/admin/creer-espace` (assistant guidé + récap avec liens) |
| 5 | « Se connecter en tant que » | bouton sur la fiche agence → bannière lecture seule dans l'espace propriétaire |
| 6 | Paramètres plateforme | `/admin/parametres-plateforme` (admin uniquement) |
| 6b | Exports CSV / imprimable | `/admin/exports` |
| 7 | Centre de notifications | `/admin/annonces` + `/proprietaire/notifications` |

## 4. Sécurité

- Chaque opération privilégiée passe par une fonction `SECURITY DEFINER`
  qui revérifie le rôle (`public.assert_staff()` / `public.assert_admin()`).
- Aucune écriture directe sur `proprietaires`, `vehicules`, `abonnements`,
  `notifications`, `parametres_plateforme` depuis le client.
- Distinction conservée : `support` peut valider/consulter/créer un
  compte/diffuser une annonce ; `admin` seul accède aux rôles et aux
  paramètres globaux.
- Impersonation : cookie httpOnly (2 h max), le staff reste authentifié
  en tant que lui-même (aucune vraie bascule de session) ; début et fin
  journalisés dans `audit_logs`.
- Aucune donnée sensible (CIN, mot de passe) n'est journalisée
  (`admin_log` refuse ces clés dans les métadonnées).

## 5. Limites techniques connues

- **Emails non envoyés.** `admin_diffuser_notification`, `admin_notifier_proprietaire`
  et la création de compte alimentent le centre de notifications in-app
  et renvoient un lien de mot de passe, mais **aucun email n'est expédié**
  tant qu'un service d'emailing (Resend / SMTP Supabase) n'est pas branché.
- **PDF = impression navigateur.** Les exports proposent un CSV et une
  « version imprimable » (HTML mis en page → Cmd/Ctrl+P → PDF). Un vrai
  générateur PDF côté serveur nécessiterait une librairie
  (`@react-pdf/renderer` ou équivalent).
- **Impersonation en lecture seule.** Threadée dans le tableau de bord,
  la flotte, les réservations, le calendrier, les statistiques et les
  notifications du propriétaire. Les pages Amendes / Paramètres / Bloquer
  et toutes les actions d'écriture ne sont pas re-scopées (le support
  observe, il n'agit pas à la place de l'agence).
- **Paramètres plateforme.** La page de gestion est complète ; côté
  consommation, seul le numéro WhatsApp de la page
  `inscription/infos-professionnelles` lit la valeur en base. Les villes
  et catégories de la recherche publique (composants client
  `SearchHero`, `EnTeteRecherche`, `CitiesGrid`) utilisent encore
  `src/lib/villes.ts` — à câbler quand ces composants passeront par un
  chargement serveur.
