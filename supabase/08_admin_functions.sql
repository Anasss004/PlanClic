-- ============================================================
-- PlanClic — Fonction admin : activer/désactiver un véhicule
-- (modération). Réservée à support/admin, journalisée, suit le
-- même principe que les autres opérations privilégiées : jamais
-- d'UPDATE brut depuis le client.
-- ============================================================

create or replace function public.admin_changer_statut_vehicule(p_vehicule_id uuid, p_statut text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.current_role() not in ('support', 'admin') then
    raise exception 'Action réservée au support';
  end if;
  if p_statut not in ('actif', 'inactif') then
    raise exception 'Statut invalide';
  end if;

  update public.vehicules set statut = p_statut where id = p_vehicule_id;

  perform public.log_audit('vehicule.moderation', 'vehicules', p_vehicule_id,
    jsonb_build_object('nouveau_statut', p_statut));
end;
$$;

revoke all on function public.admin_changer_statut_vehicule(uuid, text) from public;
grant execute on function public.admin_changer_statut_vehicule(uuid, text) to authenticated;
