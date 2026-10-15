-- Radar Ético — fontes de descoberta gerenciáveis por analista+.
-- Antes: só admin (is_admin()). Agora: analista+ (can_triage()), coerente com
-- run-scan/discover-profiles, que exigem papel mínimo "analista".

drop policy if exists discovery_sources_write on public.discovery_sources;
create policy discovery_sources_write on public.discovery_sources
  for all to authenticated
  using (public.can_triage())
  with check (public.can_triage());
