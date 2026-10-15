-- Radar Ético — schema base (fase backend)
-- Tabelas do modelo de dados: seccionais, user_roles, social_profiles, lawyer_data,
-- content_items, rules, rule_versions, alerts, alert_evidence, alert_events,
-- discovery_sources, scan_jobs, audit_logs, app_params + bucket de evidências.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------- seccionais
create table if not exists public.seccionais (
  uf   text primary key,
  nome text not null
);

-- --------------------------------------------------------------- user_roles
-- Papéis ficam em tabela separada (nunca na tabela de perfil).
create table if not exists public.user_roles (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null unique references auth.users (id) on delete cascade,
  role         text not null check (role in ('admin_nacional', 'admin_seccional', 'analista', 'leitor')),
  seccional_uf text references public.seccionais (uf),
  created_at   timestamptz not null default now()
);
create index if not exists user_roles_uf_idx on public.user_roles (seccional_uf);

-- ---------------------------------------------------------- social_profiles
create table if not exists public.social_profiles (
  id                   uuid primary key default gen_random_uuid(),
  rede                 text not null check (rede in ('instagram', 'tiktok', 'facebook', 'linkedin', 'youtube', 'x')),
  username             text not null,
  url                  text,
  nome_exibido         text,
  bio                  text,
  foto_url             text,
  seguidores           integer not null default 0,
  categoria_perfil     text,
  links_externos       text[] not null default '{}',
  lawyer_score         integer not null default 0 check (lawyer_score between 0 and 100),
  sinais_identificacao text[] not null default '{}',
  uf_provavel          text references public.seccionais (uf),
  status_monitoramento text not null default 'ativo'
                     check (status_monitoramento in ('ativo', 'pausado', 'ignorado')),
  ultima_varredura     timestamptz,
  risco_score          integer not null default 0 check (risco_score between 0 and 100),
  created_at           timestamptz not null default now(),
  unique (rede, username)
);
create index if not exists social_profiles_uf_idx on public.social_profiles (uf_provavel);
create index if not exists social_profiles_status_idx on public.social_profiles (status_monitoramento);

-- -------------------------------------------------------------- lawyer_data
create table if not exists public.lawyer_data (
  profile_id    uuid primary key references public.social_profiles (id) on delete cascade,
  nome_completo text,
  oab_numero    text,
  oab_uf        text,
  oab_validacao text not null default 'pendente'
                check (oab_validacao in ('pendente', 'valida', 'divergente', 'nao_encontrada')),
  telefones     jsonb not null default '[]',  -- [{valor, fonte}]
  whatsapp      jsonb not null default '[]',  -- [{valor, fonte}]
  emails        jsonb not null default '[]',  -- [{valor, fonte}]
  site          jsonb,                         -- {valor, fonte}
  endereco      text,
  coletado_em   timestamptz not null default now()
);

-- ------------------------------------------------------------ content_items
create table if not exists public.content_items (
  id            uuid primary key default gen_random_uuid(),
  profile_id    uuid not null references public.social_profiles (id) on delete cascade,
  tipo          text not null check (tipo in ('post', 'reels', 'story', 'bio', 'comentario', 'link')),
  url           text,
  texto         text,
  hashtags      text[] not null default '{}',
  midia_urls    text[] not null default '{}',
  publicado_em  timestamptz,
  coletado_em   timestamptz not null default now(),
  hash_conteudo text not null,
  unique (profile_id, hash_conteudo)
);
create index if not exists content_items_profile_idx on public.content_items (profile_id);

-- -------------------------------------------------------------------- rules
create table if not exists public.rules (
  id                 uuid primary key default gen_random_uuid(),
  codigo             text not null unique,
  nome               text not null,
  descricao          text,
  categoria          text,
  fundamento_normativo text,
  tipo_deteccao      text not null default 'palavra_chave'
                     check (tipo_deteccao in ('palavra_chave', 'regex', 'ia_semantica', 'combinada')),
  padroes            text[] not null default '{}',
  exemplos_positivos text[] not null default '{}',
  exemplos_negativos text[] not null default '{}',
  gravidade          text not null check (gravidade in ('baixa', 'media', 'alta')),
  peso_score         integer not null default 10,
  limiar_confianca   numeric(3, 2) not null default 0.70,
  redes_aplicaveis   text[] not null default '{}',
  escopo             text not null default 'nacional',  -- 'nacional' ou UF
  ativo              boolean not null default true,
  versao             integer not null default 1,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists rules_touch on public.rules;
create trigger rules_touch
  before update on public.rules
  for each row execute function public.touch_updated_at();

-- ------------------------------------------------------------- rule_versions
create table if not exists public.rule_versions (
  id       uuid primary key default gen_random_uuid(),
  rule_id  uuid not null references public.rules (id) on delete cascade,
  versao   integer not null,
  autor    text,
  mudanca  text,
  criado_em timestamptz not null default now(),
  unique (rule_id, versao)
);
create index if not exists rule_versions_rule_idx on public.rule_versions (rule_id);

-- ------------------------------------------------------------------- alerts
create table if not exists public.alerts (
  id              uuid primary key default gen_random_uuid(),
  profile_id      uuid not null references public.social_profiles (id) on delete cascade,
  content_item_id uuid references public.content_items (id) on delete set null,
  rule_id         uuid references public.rules (id) on delete set null,
  rule_versao     integer,
  trecho_detectado text,
  justificativa_ia text,
  confianca       numeric(3, 2),
  gravidade       text check (gravidade in ('baixa', 'media', 'alta')),
  status          text not null default 'novo'
                  check (status in ('novo', 'em_analise', 'confirmado', 'falso_positivo', 'encaminhado_ted', 'arquivado')),
  analista_id     uuid references auth.users (id) on delete set null,
  seccional_uf    text references public.seccionais (uf),
  criado_em       timestamptz not null default now(),
  -- não duplicar alertas: mesmo conteúdo + mesma regra
  unique (content_item_id, rule_id)
);
create index if not exists alerts_profile_idx on public.alerts (profile_id);
create index if not exists alerts_uf_status_idx on public.alerts (seccional_uf, status);
create index if not exists alerts_rule_idx on public.alerts (rule_id);

-- ------------------------------------------------------------ alert_evidence
-- Cadeia de custódia: print (storage), link, texto e hash.
create table if not exists public.alert_evidence (
  id              uuid primary key default gen_random_uuid(),
  alert_id        uuid not null references public.alerts (id) on delete cascade,
  screenshot_url  text,
  url_original    text,
  texto_capturado text,
  hash_sha256     text,
  capturado_em    timestamptz not null default now()
);
create index if not exists alert_evidence_alert_idx on public.alert_evidence (alert_id);

-- -------------------------------------------------------------- alert_events
create table if not exists public.alert_events (
  id        uuid primary key default gen_random_uuid(),
  alert_id  uuid not null references public.alerts (id) on delete cascade,
  tipo      text not null check (tipo in ('status', 'comentario', 'atribuicao')),
  texto     text,
  autor     text,
  criado_em timestamptz not null default now()
);
create index if not exists alert_events_alert_idx on public.alert_events (alert_id);

-- ---------------------------------------------------------- discovery_sources
create table if not exists public.discovery_sources (
  id     uuid primary key default gen_random_uuid(),
  tipo   text not null check (tipo in ('hashtag', 'termo', 'perfil')),
  valor  text not null,
  rede   text,
  ativo  boolean not null default true
);

-- ----------------------------------------------------------------- scan_jobs
create table if not exists public.scan_jobs (
  id                uuid primary key default gen_random_uuid(),
  tipo              text not null check (tipo in ('descoberta', 'coleta', 'analise')),
  status            text not null default 'executando'
                    check (status in ('concluido', 'falhou', 'executando')),
  inicio            timestamptz not null default now(),
  fim               timestamptz,
  itens_processados integer not null default 0,
  erros             text[] not null default '{}',
  custo_estimado    numeric(10, 2) not null default 0
);

-- ---------------------------------------------------------------- audit_logs
create table if not exists public.audit_logs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users (id) on delete set null,
  acao        text not null,
  entidade    text,
  entidade_id text,
  payload     jsonb,
  criado_em   timestamptz not null default now()
);
create index if not exists audit_logs_user_idx on public.audit_logs (user_id);
create index if not exists audit_logs_criado_idx on public.audit_logs (criado_em desc);

-- ---------------------------------------------------------------- app_params
create table if not exists public.app_params (
  id               integer primary key default 1 check (id = 1),
  limiar_global    numeric(3, 2) not null default 0.70,
  retencao_dias    integer not null default 180,
  frequencia_horas integer not null default 6,
  lawyer_score_min integer not null default 60,
  updated_at       timestamptz not null default now()
);

-- --------------------------------------------- storage: bucket de evidências
insert into storage.buckets (id, name, public)
values ('evidencias', 'evidencias', false)
on conflict (id) do nothing;
