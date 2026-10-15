# Runbook — ligando o backend do Radar Ético

Tudo que precisa de acesso ao projeto Supabase está aqui em ordem.
O código já está no repo; abaixo só os passos manuais.

## 1. Aplicar as migrations (SQL Editor do Supabase)

Ordem (uma por vez, botão Run):

1. `supabase/migrations/20261015010000_radar_etico_schema.sql` — 14 tabelas + bucket `evidencias`
2. `supabase/migrations/20261015020000_radar_etico_rls.sql` — helpers + RLS por seccional
3. `supabase/migrations/20261015030000_radar_etico_seed.sql` — seccionais, 10 regras, fontes, parâmetros + dados fictícios
4. `supabase/migrations/20261015040000_radar_etico_user_roles.sql` — nome/e-mail em `user_roles` + trigger de auto-provisionamento

Conferência rápida (SQL Editor):

```sql
select count(*) from social_profiles;  -- esperado: 30
select count(*) from content_items;    -- esperado: 80
select count(*) from alerts;           -- esperado: 28
select count(*) from rules;            -- esperado: 10
```

## 2. Deploy das edge functions (CLI, na pasta do repo)

```sh
npx supabase login
npx supabase link --project-ref achwbonywxbonsqfidtm
npx supabase functions deploy discover-profiles classify-lawyer analyze-content enrich-lawyer run-scan
```

## 3. Segredo da IA (Lovable AI)

Em Lovable Cloud a `LOVABLE_API_KEY` costuma já vir provisionada.
Confira em Supabase Dashboard → Edge Functions → Secrets:

- Se existir: nada a fazer. A camada semântica do `analyze-content` ativa sozinha.
- Se não existir: a análise segue funcionando só com as regras determinísticas
  (o código faz fallback sozinho, sem quebrar).

## 4. Criar os usuários (Authentication → Add user)

Crie os 4 usuários de demonstração (o trigger cria a linha em `user_roles`
com papel `leitor` automaticamente). Depois rode no SQL Editor para dar os papéis:

```sql
update user_roles set role = 'admin_nacional', seccional_uf = null
where email = 'nacional@exemplo.org';

update user_roles set role = 'admin_seccional', seccional_uf = 'SP'
where email = 'admin.sp@exemplo.org';

update user_roles set role = 'analista', seccional_uf = 'SP'
where email = 'analista@exemplo.org';

update user_roles set role = 'leitor', seccional_uf = 'RJ'
where email = 'leitor.rj@exemplo.org';
```

Use e-mails e senhas reais (ex.: `admin@oab.exemplo.org`). Os `@exemplo.org`
acima são só ilustrativos — ajuste o `where` para os e-mails que você criar.

## 5. Verificar no app

1. Abra o app publicado → deve cair na tela **/login** (selo "Conectado ao banco" no topo).
2. Entre com um dos usuários.
3. Vá em **Varreduras → Rodar agora** → deve criar perfis/conteúdos/alertas novos
   (via `run-scan` → 4 functions).
4. Confira **Fila de alertas** e **Administração → Auditoria**.

## 6. Agendamento automático (varredura a cada 6h)

1. Rode a migration `20261015060000_radar_etico_agendamento.sql` no SQL Editor
   (habilita `pg_cron` e `pg_net`).
2. Gere um segredo e registre nas functions (na pasta do repo):
   ```sh
   npx supabase secrets set CRON_SECRET=$(openssl rand -hex 32)
   npx supabase functions deploy run-scan discover-profiles classify-lawyer analyze-content enrich-lawyer
   ```
   (O deploy republica as functions com o suporte a `x-cron-secret`.)
3. No SQL Editor, crie o job — **troque `SEU_SEGREDO` pelo mesmo valor**:
   ```sql
   select cron.schedule(
     'radar-etico-varredura',
     '0 */6 * * *',
     $$
     select net.http_post(
       url := 'https://achwbonywxbonsqfidtm.supabase.co/functions/v1/run-scan',
       headers := jsonb_build_object(
         'Content-Type', 'application/json',
         'x-cron-secret', 'SEU_SEGREDO'
       ),
       body := '{}'::jsonb
     );
     $$
   );
   ```
4. Confira: `select * from cron.job;` — para desativar:
   `select cron.unschedule('radar-etico-varredura');`

## Notas

- Sem login ou com o banco inacessível, o app cai para **demonstração local**
  (dados fictícios em memória, selo âmbar no topo) — nada quebra.
- `validateOAB` é stub (retorna `pendente`): a integração com o CNA entra depois.
- Screenshots de evidência: `screenshot_url` fica nulo até a coleta real gerar prints
  no bucket `evidencias`.
