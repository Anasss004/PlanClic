-- ============================================================
-- PlanClic — Création automatique du profil à l'inscription
-- À exécuter APRÈS le script principal (00_ALL_IN_ONE.sql / 01-04)
-- ============================================================

-- Cette fonction lit les métadonnées passées lors de l'inscription
-- (voir le code Next.js plus bas : supabase.auth.signUp avec "options.data")
-- et crée automatiquement la ligne correspondante dans public.profiles.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, role, genre, nom, prenom, date_naissance, telephone, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'role', 'client'),
    new.raw_user_meta_data->>'genre',
    coalesce(new.raw_user_meta_data->>'nom', ''),
    coalesce(new.raw_user_meta_data->>'prenom', ''),
    nullif(new.raw_user_meta_data->>'date_naissance', '')::date,
    new.raw_user_meta_data->>'telephone',
    new.email
  );
  return new;
end;
$$;

-- Le trigger se déclenche sur auth.users (géré par Supabase), pas sur
-- une table qu'on a créée nous-mêmes — c'est le point d'entrée standard
-- recommandé par Supabase pour ce genre de besoin.
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
