-- Radar Ético — RLS por seccional + papéis
-- Hierarquia: admin_nacional > admin_seccional > analista > leitor.
-- Papéis vivem em user_roles (nunca no perfil). Helpers SECURITY DEFINER
-- leem o papel/UF do usuário autenticado.

-- ---------------------------------------------------------- helpers
create or replace function public.my_role()
returns text
language sql stable security definer set search_path = public
as $$ select role from public.user_roles where user_id = auth.uid() $$;

create or replace function public.my_uf()
returns text
language sql stable security definer set search_path = public
as $$ select seccional_uf from public.user_roles where user_id = auth.uid() $$;

create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$ select public.my_role() in ('admin_nacional', 'admin_seccional') $$;

create or replace function public.can_triage()
returns boolean
language sql stable security definer set search_path = public
as $$ select public.my_role() in ('admin_nacional', 'admin_seccional', 'analista') $$;

-- ================================================================ seccionais
alter table public.seccionais enable row level security;

drop policy if exists seccionais_read on public.seccionais;
create policy seccionais_read on public.seccionais
  for select to authenticated using (true);

drop policy if exists seccionais_admin on public.seccionais;
create policy seccionais_admin on public.seccionais
  for all to authenticated
  using (public.my_role() = 'admin_nacional')
  with check (public.my_role() = 'admin_nacional');

-- ================================================================ user_roles
alter table public.user_roles enable row level security;

drop policy if exists user_roles_read on public.user_roles;
create policy user_roles_read on public.user_roles
  for select to authenticated
  using (
    user_id = auth.uid()
    or public.my_role() = 'admin_nacional'
    or (public.my_role() = 'admin_seccional' and seccional_uf = public.my_uf())
  );

drop policy if exists user_roles_write on public.user_roles;
create policy user_roles_write on public.user_roles
  for all to authenticated
  using (
    public.my_role() = 'admin_nacional'
    or (
      public.my_role() = 'admin_seccional'
      and seccional_uf = public.my_uf()
      and role <> 'admin_nacional'
    )
  )
  with check (
    public.my_role() = 'admin_nacional'
    or (
      public.my_role() = 'admin_seccional'
      and seccional_uf = public.my_uf()
      and role <> 'admin_nacional'
    )
  );

-- =========================================================== social_profiles
alter table public.social_profiles enable row level security;

drop policy if exists social_profiles_read on public.social_profiles;
create policy social_profiles_read on public.social_profiles
  for select to authenticated
  using (
    public.my_role() = 'admin_nacional'
    or uf_provavel = public.my_uf()
  );

drop policy if exists social_profiles_triage on public.social_profiles;
create policy social_profiles_triage on public.social_profiles
  for update to authenticated
  using (
    public.my_role() = 'admin_nacional'
    or (public.can_triage() and uf_provavel = public.my_uf())
  )
  with check (
    public.my_role() = 'admin_nacional'
    or (public.can_triage() and uf_provavel = public.my_uf())
  );

drop policy if exists social_profiles_admin_write on public.social_profiles;
create policy social_profiles_admin_write on public.social_profiles
  for all to authenticated
  using (
    public.my_role() = 'admin_nacional'
    or (public.is_admin() and uf_provavel = public.my_uf())
  )
  with check (
    public.my_role() = 'admin_nacional'
    or (public.is_admin() and uf_provavel = public.my_uf())
  );

-- ============================================================== lawyer_data
alter table public.lawyer_data enable row level security;

drop policy if exists lawyer_data_read on public.lawyer_data;
create policy lawyer_data_read on public.lawyer_data
  for select to authenticated
  using (exists (
    select 1 from public.social_profiles p
    where p.id = lawyer_data.profile_id
      and (public.my_role() = 'admin_nacional' or p.uf_provavel = public.my_uf())
  ));

drop policy if exists lawyer_data_write on public.lawyer_data;
create policy lawyer_data_write on public.lawyer_data
  for all to authenticated
  using (exists (
    select 1 from public.social_profiles p
    where p.id = lawyer_data.profile_id
      and (public.my_role() = 'admin_nacional'
           or (public.can_triage() and p.uf_provavel = public.my_uf()))
  ))
  with check (exists (
    select 1 from public.social_profiles p
    where p.id = lawyer_data.profile_id
      and (public.my_role() = 'admin_nacional'
           or (public.can_triage() and p.uf_provavel = public.my_uf()))
  ));

-- ============================================================ content_items
alter table public.content_items enable row level security;

drop policy if exists content_items_read on public.content_items;
create policy content_items_read on public.content_items
  for select to authenticated
  using (exists (
    select 1 from public.social_profiles p
    where p.id = content_items.profile_id
      and (public.my_role() = 'admin_nacional' or p.uf_provavel = public.my_uf())
  ));

drop policy if exists content_items_write on public.content_items;
create policy content_items_write on public.content_items
  for all to authenticated
  using (exists (
    select 1 from public.social_profiles p
    where p.id = content_items.profile_id
      and (public.my_role() = 'admin_nacional'
           or (public.can_triage() and p.uf_provavel = public.my_uf()))
  ))
  with check (exists (
    select 1 from public.social_profiles p
    where p.id = content_items.profile_id
      and (public.my_role() = 'admin_nacional'
           or (public.can_triage() and p.uf_provavel = public.my_uf()))
  ));

-- ==================================================================== rules
-- Leitura: regras nacionais para todos; regras de UF só para a UF (+ nacional).
alter table public.rules enable row level security;

drop policy if exists rules_read on public.rules;
create policy rules_read on public.rules
  for select to authenticated
  using (
    escopo = 'nacional'
    or escopo = public.my_uf()
    or public.my_role() = 'admin_nacional'
  );

drop policy if exists rules_write on public.rules;
create policy rules_write on public.rules
  for all to authenticated
  using (
    public.my_role() = 'admin_nacional'
    or (public.my_role() = 'admin_seccional' and escopo = public.my_uf())
  )
  with check (
    public.my_role() = 'admin_nacional'
    or (public.my_role() = 'admin_seccional' and escopo = public.my_uf())
  );

-- ============================================================= rule_versions
alter table public.rule_versions enable row level security;

drop policy if exists rule_versions_read on public.rule_versions;
create policy rule_versions_read on public.rule_versions
  for select to authenticated
  using (exists (
    select 1 from public.rules r
    where r.id = rule_versions.rule_id
      and (r.escopo = 'nacional' or r.escopo = public.my_uf()
           or public.my_role() = 'admin_nacional')
  ));

drop policy if exists rule_versions_write on public.rule_versions;
create policy rule_versions_write on public.rule_versions
  for all to authenticated
  using (
    public.my_role() = 'admin_nacional'
    or exists (
      select 1 from public.rules r
      where r.id = rule_versions.rule_id
        and public.my_role() = 'admin_seccional' and r.escopo = public.my_uf()
    )
  )
  with check (
    public.my_role() = 'admin_nacional'
    or exists (
      select 1 from public.rules r
      where r.id = rule_versions.rule_id
        and public.my_role() = 'admin_seccional' and r.escopo = public.my_uf()
    )
  );

-- ==================================================================== alerts
alter table public.alerts enable row level security;

drop policy if exists alerts_read on public.alerts;
create policy alerts_read on public.alerts
  for select to authenticated
  using (
    public.my_role() = 'admin_nacional'
    or seccional_uf = public.my_uf()
  );

-- Triagem (mudar status, atribuir): analista+ da UF. Criação fica com as
-- edge functions (service_role, bypass de RLS).
drop policy if exists alerts_triage on public.alerts;
create policy alerts_triage on public.alerts
  for update to authenticated
  using (
    public.my_role() = 'admin_nacional'
    or (public.can_triage() and seccional_uf = public.my_uf())
  )
  with check (
    public.my_role() = 'admin_nacional'
    or (public.can_triage() and seccional_uf = public.my_uf())
  );

-- ============================================================ alert_evidence
alter table public.alert_evidence enable row level security;

drop policy if exists alert_evidence_read on public.alert_evidence;
create policy alert_evidence_read on public.alert_evidence
  for select to authenticated
  using (exists (
    select 1 from public.alerts a
    where a.id = alert_evidence.alert_id
      and (public.my_role() = 'admin_nacional' or a.seccional_uf = public.my_uf())
  ));

-- ============================================================== alert_events
alter table public.alert_events enable row level security;

drop policy if exists alert_events_read on public.alert_events;
create policy alert_events_read on public.alert_events
  for select to authenticated
  using (exists (
    select 1 from public.alerts a
    where a.id = alert_events.alert_id
      and (public.my_role() = 'admin_nacional' or a.seccional_uf = public.my_uf())
  ));

drop policy if exists alert_events_write on public.alert_events;
create policy alert_events_write on public.alert_events
  for insert to authenticated
  with check (exists (
    select 1 from public.alerts a
    where a.id = alert_events.alert_id
      and (public.my_role() = 'admin_nacional'
           or (public.can_triage() and a.seccional_uf = public.my_uf()))
  ));

-- ========================================================== discovery_sources
alter table public.discovery_sources enable row level security;

drop policy if exists discovery_sources_read on public.discovery_sources;
create policy discovery_sources_read on public.discovery_sources
  for select to authenticated using (true);

drop policy if exists discovery_sources_write on public.discovery_sources;
create policy discovery_sources_write on public.discovery_sources
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ================================================================= scan_jobs
alter table public.scan_jobs enable row level security;

drop policy if exists scan_jobs_read on public.scan_jobs;
create policy scan_jobs_read on public.scan_jobs
  for select to authenticated using (true);

drop policy if exists scan_jobs_write on public.scan_jobs;
create policy scan_jobs_write on public.scan_jobs
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ================================================================ audit_logs
-- Todo acesso a dados pessoais e mudança de status é auditado. Leitura: admins.
alter table public.audit_logs enable row level security;

drop policy if exists audit_logs_insert on public.audit_logs;
create policy audit_logs_insert on public.audit_logs
  for insert to authenticated
  with check (user_id = auth.uid() or user_id is null);

drop policy if exists audit_logs_read on public.audit_logs;
create policy audit_logs_read on public.audit_logs
  for select to authenticated
  using (public.is_admin());

-- ================================================================ app_params
alter table public.app_params enable row level security;

drop policy if exists app_params_read on public.app_params;
create policy app_params_read on public.app_params
  for select to authenticated using (true);

drop policy if exists app_params_write on public.app_params;
create policy app_params_write on public.app_params
  for all to authenticated
  using (public.my_role() = 'admin_nacional')
  with check (public.my_role() = 'admin_nacional');

-- ================================================== storage: evidencias
-- Bucket privado. Leitura: autenticados (equipe OAB). Escrita: só via
-- service_role (edge functions que capturam os prints).
drop policy if exists evidencias_read on storage.objects;
create policy evidencias_read on storage.objects
  for select to authenticated
  using (bucket_id = 'evidencias');

drop policy if exists evidencias_svc_write on storage.objects;
create policy evidencias_svc_write on storage.objects
  for all to service_role
  using (bucket_id = 'evidencias')
  with check (bucket_id = 'evidencias');
