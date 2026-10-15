-- Radar Ético — agendamento da varredura automática.
-- Habilita pg_cron (agendador) e pg_net (chamadas HTTP).
-- O job em si é criado à parte no SQL Editor (ver RUNBOOK), pois contém o
-- segredo do cron — que não deve ser commitado no repositório.

create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;
