-- Radar Ético — seed: seccionais, 10 regras, fontes de descoberta, parâmetros
-- e dados de exemplo fictícios (~30 perfis, ~80 conteúdos, ~28 alertas).

-- ------------------------------------------------------------ seccionais
insert into public.seccionais (uf, nome) values
  ('SP', 'São Paulo'),
  ('RJ', 'Rio de Janeiro'),
  ('MG', 'Minas Gerais'),
  ('PE', 'Pernambuco'),
  ('RS', 'Rio Grande do Sul')
on conflict (uf) do nothing;

-- ----------------------------------------------------------------- regras
insert into public.rules
  (codigo, nome, descricao, categoria, fundamento_normativo, tipo_deteccao,
   padroes, exemplos_positivos, exemplos_negativos,
   gravidade, peso_score, limiar_confianca, redes_aplicaveis, escopo, ativo, versao)
values
  ('CAP-01', 'Chamada para contato privado', 'Convite para que o público inicie contato privado visando contratação.',
   'CAP', 'Provimento 205/2021, art. 3º; CED, arts. 39 a 47', 'palavra_chave',
   array['chama no direct','chama na dm','me manda dm','me manda uma dm','te mando mais informacoes no direct','chama no zap','chama no whats','chama no inbox','me chama no privado'],
   array['Teve o benefício negado? Chama no direct!','Me manda DM que te explico como resolver','Dúvidas? Chama no zap'],
   array['Não respondo consultas pelo direct; procure a Defensoria.','O golpe do falso advogado começa com mensagens no direct.'],
   'alta', 30, 0.70, '{}', 'nacional', true, 1),
  ('CAP-02', 'Comente e receba', 'Mecânica de engajamento condicionando envio de material/atendimento.',
   'CAP', 'Provimento 205/2021, art. 3º; CED, arts. 39 a 47', 'palavra_chave',
   array['comente quero','comenta eu quero','comente eu quero','comente e receba','comenta que eu te envio'],
   array['Comente QUERO e receba o modelo','Comenta EU QUERO que eu te envio','Comente e receba o guia'],
   array['Comente qual tema vocês querem ver na próxima aula.','Deixe nos comentários sua opinião sobre a decisão do STF.'],
   'alta', 30, 0.70, '{}', 'nacional', true, 1),
  ('CAP-03', 'Clique e fale comigo', 'Direcionamento para canal de contato com fim de captação.',
   'CAP', 'Provimento 205/2021, art. 3º; CED, arts. 39 a 47', 'palavra_chave',
   array['clique no link e fale comigo','link na bio para falar comigo','fale comigo pelo link'],
   array['Clique no link e fale comigo agora','Link na bio para falar comigo','Fale comigo pelo link'],
   array['O link na bio leva ao artigo completo.','Clique no link para ler a íntegra da lei.'],
   'media', 15, 0.70, '{}', 'nacional', true, 1),
  ('CAP-04', 'Oferta direta de consulta', 'Oferta ativa de serviços ao público indeterminado.',
   'CAP', 'Provimento 205/2021, art. 3º; CED, arts. 39 a 47', 'palavra_chave',
   array['agende sua consulta','agende ja sua consulta','atendo todo o brasil'],
   array['Agende sua consulta hoje','Atendo todo o Brasil, me chama','Agende já sua consulta'],
   array['Escritório com atuação nacional em direito tributário.','Atendimento mediante agendamento.'],
   'media', 15, 0.70, '{}', 'nacional', true, 1),
  ('MER-01', 'Preço e gratuidade', 'Divulgação de preços, gratuidade ou condições de pagamento.',
   'MER', 'Provimento 205/2021, art. 3º; CED, arts. 39 a 47', 'regex',
   array['consulta gratis','primeira consulta gratuita','consulta gratuita','honorarios a partir de r\$','parcelo em \d+ ?(x|vezes)','so paga se ganhar'],
   array['Primeira consulta gratuita!','Honorários a partir de R$ 500','Só paga se ganhar'],
   array['A tabela de honorários da OAB é referência mínima.','Quem não pode pagar tem direito à assistência gratuita.'],
   'alta', 30, 0.70, '{}', 'nacional', true, 1),
  ('MER-02', 'Promoções e sorteios', 'Uso de mecânicas mercantis.',
   'MER', 'Provimento 205/2021, art. 3º; CED, arts. 39 a 47', 'palavra_chave',
   array['sorteio','promocao','cupom','black friday'],
   array['Sorteio de uma consulta','Promoção de inventário','Black Friday jurídica'],
   array['Fraude em sorteios de rifas: o que diz a lei.','Direitos do consumidor na Black Friday.'],
   'media', 15, 0.70, '{}', 'nacional', true, 1),
  ('RES-01', 'Promessa de resultado', 'Garantia ou promessa de êxito.',
   'RES', 'Provimento 205/2021, art. 3º; CED, arts. 39 a 47', 'palavra_chave',
   array['causa ganha','resultado garantido','100% de exito','vitoria garantida'],
   array['Causa ganha, pode confiar','Resultado garantido','100% de êxito'],
   array['Nenhum advogado pode garantir resultado.','Não existe causa ganha antes da sentença.'],
   'alta', 30, 0.70, '{}', 'nacional', true, 1),
  ('RES-02', 'Divulgação de valores/casos', 'Exposição de valores obtidos ou casos concretos.',
   'RES', 'Provimento 205/2021, art. 3º; CED, arts. 39 a 47', 'regex',
   array['consegui r\$ ?[\d.,]+','ganhamos r\$ ?[\d.,]+','alvara de r\$'],
   array['Consegui R$ 85.000 para minha cliente','Ganhamos R$ 120 mil','Alvará de R$ 40.000 liberado'],
   array['O teto do INSS em 2026 é de R$ 8.000.','Entenda como é calculado o valor da causa.'],
   'media', 15, 0.70, '{}', 'nacional', true, 1),
  ('AUT-01', 'Autoengrandecimento', 'Expressões de superioridade.',
   'AUT', 'Provimento 205/2021, art. 3º; CED, arts. 39 a 47', 'palavra_chave',
   array['o melhor advogado','a melhor advogada','numero 1 em','n 1 em'],
   array['O melhor advogado da cidade','Número 1 em revisão','A melhor advogada de família'],
   array['Como escolher um advogado de confiança.','O melhor caminho é a conciliação.'],
   'baixa', 5, 0.70, '{}', 'nacional', true, 1),
  ('URG-01', 'Apelo de urgência', 'Pressão temporal para contratação.',
   'URG', 'Provimento 205/2021, art. 3º; CED, arts. 39 a 47', 'palavra_chave',
   array['ultimas vagas','nao perca seu direito','me chama agora','so hoje'],
   array['Últimas vagas para revisão','Não perca seu direito, me chama agora','Só hoje!'],
   array['O prazo prescricional é de 5 anos.','Atenção ao prazo de recurso.'],
   'baixa', 5, 0.70, '{}', 'nacional', true, 1)
on conflict (codigo) do nothing;

insert into public.rule_versions (rule_id, versao, autor, mudanca)
select id, 1, 'Sistema', 'Criação (seed)' from public.rules
on conflict (rule_id, versao) do nothing;

-- ------------------------------------------------------ fontes de descoberta
insert into public.discovery_sources (tipo, valor, rede, ativo) values
  ('hashtag', '#advogado', 'instagram', true),
  ('hashtag', '#advocacia', 'instagram', true),
  ('hashtag', '#direitoprevidenciario', 'tiktok', true),
  ('hashtag', '#advogada', 'instagram', true),
  ('termo', 'OAB/', 'instagram', true),
  ('termo', 'advogada', 'tiktok', false)
on conflict do nothing;

-- --------------------------------------------------------------- parâmetros
insert into public.app_params (id, limiar_global, retencao_dias, frequencia_horas, lawyer_score_min)
values (1, 0.70, 180, 6, 60)
on conflict (id) do nothing;

-- ============================================================ dados de exemplo
-- Perfis/conteúdos/alertas fictícios, gerados de forma determinística.
-- Idempotente: só executa se ainda não houver perfis.
do $$
declare
  base_ts   timestamptz := timestamptz '2026-10-14 12:00:00+00';
  ufs       text[] := array['SP','RJ','MG','PE','RS'];
  nomes     text[] := array['Ana','Bruno','Carla','Diego','Elisa','Fábio','Gabriela','Heitor','Isabela','João','Karina','Lucas','Marina','Nicolas','Olívia'];
  areas     text[] := array['Direito Previdenciário','Direito de Família','Direito Trabalhista','Direito do Consumidor','Direito Criminal','Direito Tributário'];
  redes     text[] := array['instagram','instagram','tiktok','facebook','linkedin','youtube','x'];
  tipos     text[] := array['post','reels','post','story','bio'];
  statuses  text[] := array['novo','novo','em_analise','confirmado','novo','falso_positivo','encaminhado_ted','em_analise','arquivado','confirmado'];
  irreg     text[] := array[
    'Teve o benefício negado pelo INSS? Chama no direct que eu resolvo! #direitoprevidenciario',
    'Comente QUERO e eu te envio o checklist da aposentadoria especial.',
    'Primeira consulta gratuita só esta semana. Agende sua consulta! #advogado',
    'Consegui R$ 85.000 para minha cliente em ação trabalhista!',
    'Divórcio rápido, resultado garantido. Me chama agora!',
    'Black Friday jurídica: cupom de 30% em inventários.',
    'Sou o melhor advogado de família da região. Link na bio para falar comigo.',
    'Últimas vagas para revisão da vida toda. Não perca seu direito!',
    'Honorários a partir de R$ 300, parcelo em 10x. Chama no zap!',
    'Atendo todo o Brasil, me chama no privado.',
    'Sorteio de uma consulta para quem seguir o perfil e marcar 3 amigos!',
    'Só paga se ganhar! Causa ganha em ações contra bancos.'];
  irreg_rule text[] := array['CAP-01','CAP-02','CAP-04','RES-02','RES-01','MER-02','AUT-01','URG-01','MER-01','CAP-01','MER-02','MER-01'];
  reg       text[] := array[
    'Hoje explico a diferença entre guarda compartilhada e unilateral. #advocacia',
    'Você sabia que o prazo para reclamar verbas trabalhistas é de 2 anos após o fim do contrato?',
    'Nenhum advogado pode garantir resultado. Desconfie de promessas!',
    'Resumo da decisão do STJ sobre superendividamento.',
    'Participei hoje do congresso de Direito Previdenciário da Seccional.',
    'O golpe do falso advogado começa com mensagens no direct. Cuidado!',
    'Direitos do consumidor na Black Friday: guarde os comprovantes.',
    'Leitura recomendada: Código de Ética e Disciplina da OAB.',
    'Entenda como funciona a pensão por morte após a reforma.',
    'Quem não pode pagar tem direito à assistência gratuita pela Defensoria.',
    'Dica: guarde sempre os holerites e o extrato do FGTS.',
    'Feliz Dia do Advogado a todos os colegas!',
    'Como é calculada a revisão do FGTS? Explico no carrossel.',
    'Fraude em sorteios de rifas: o que diz a lei.'];
  pids      uuid[] := '{}';
  i         int; k int; a int := 0;
  nome      text; uf text; fem boolean; area text; rede text;
  slug      text; username text; oab_num text; oab_style text; has_oab boolean;
  bio       text; phone text; email text; wa text; site text;
  cat       text; score int; sinais text[];
  pid       uuid; cid uuid; aid uuid;
  texto     text; tipo text; irregular boolean; idx int;
  rule_code text; rule_id uuid; rule_nome text; rule_grav text; st text;
  trecho    text; justif text; curl text;
begin
  if exists (select 1 from public.social_profiles limit 1) then
    return;
  end if;

  -- perfis + lawyer_data
  for i in 0..29 loop
    nome := nomes[(i % 15) + 1];
    uf   := ufs[(i % 5) + 1];
    fem  := right(nome, 1) = 'a';
    area := areas[(i % 6) + 1];
    rede := redes[(i % 7) + 1];
    slug := translate(lower(nome), 'áéíóúâêîôãõç', 'aeiouaeioaoc');
    username := (case when fem then 'dra.' else 'dr.' end) || slug || '.exemplo' || (i + 1)::text;
    oab_num := ((120 + i * 7) % 900) || '.' || ((100 + i * 13) % 900);
    has_oab := (i % 7 <> 6);
    oab_style := case (i % 3)
      when 0 then 'OAB/' || uf || ' ' || oab_num
      when 1 then 'OAB-' || uf || ' nº ' || replace(oab_num, '.', '')
      else 'OAB ' || replace(oab_num, '.', '') || '/' || uf end;
    phone := '(11) 9' || lpad((8000 + i)::text, 4, '0') || '-' || (1000 + i * 3)::text;
    email := 'contato' || (i + 1)::text || '@exemplo-ficticio.adv.br';
    wa    := 'https://wa.me/55119' || (80000000 + i * 1111)::text;
    site  := 'https://' || slug || 'exemplo.adv.br';
    if has_oab then
      bio := (case when fem then 'Advogada' else 'Advogado' end)
             || ' | ' || oab_style || ' | ' || area || ' | ' || phone || ' | ' || email;
    else
      bio := (case when fem then 'Dra.' else 'Dr.' end)
             || ' ' || nome || ' Exemplo · ' || area || ' · conteúdo fictício';
    end if;
    cat := case when (i % 4) = 3 then 'Criador de conteúdo'
                when fem then 'Advogada' else 'Advogado' end;
    score := 0;
    if has_oab then score := score + 50; end if;
    score := score + 20; -- bio contém advogado(a)/adv.
    if not has_oab then score := score + 15; end if; -- Dr./Dra. + termo jurídico
    if cat in ('Advogada', 'Advogado') then score := score + 20; end if;
    score := score + 10; -- link para site jurídico
    score := least(score, 100);
    sinais := array['bio contém ''advogado(a)''', 'link para site jurídico'];
    if has_oab then sinais := sinais || ('bio contém OAB/' || uf); end if;
    if not has_oab then sinais := sinais || 'Dr./Dra. + termo jurídico'; end if;
    if cat in ('Advogada', 'Advogado') then sinais := sinais || 'categoria: Advogado'; end if;

    insert into public.social_profiles
      (rede, username, url, nome_exibido, bio, seguidores, categoria_perfil,
       links_externos, lawyer_score, sinais_identificacao, uf_provavel,
       status_monitoramento, ultima_varredura, risco_score)
    values
      (rede, username, 'https://' || rede || '.com/' || username,
       (case when fem then 'Dra. ' else 'Dr. ' end) || nome || ' Exemplo',
       bio, 800 + ((i * 7919) % 90000), cat,
       array[wa, site], score, sinais, uf,
       case when i = 28 then 'pausado' when i = 29 then 'ignorado' else 'ativo' end,
       base_ts - (((i % 4)::text) || ' days')::interval - (((i % 12)::text) || ' hours')::interval,
       0)
    returning id into pid;
    pids := pids || pid;

    insert into public.lawyer_data
      (profile_id, nome_completo, oab_numero, oab_uf, oab_validacao,
       telefones, whatsapp, emails, site, coletado_em)
    values
      (pid, nome || ' Exemplo da Silva (fictício)',
       case when has_oab then replace(oab_num, '.', '') end,
       case when has_oab then uf end,
       case when not has_oab then 'nao_encontrada'
            else (array['pendente','valida','valida','divergente'])[(i % 4) + 1] end,
       jsonb_build_array(jsonb_build_object('valor', phone, 'fonte', 'bio')),
       jsonb_build_array(jsonb_build_object('valor', wa, 'fonte', 'link')),
       jsonb_build_array(jsonb_build_object('valor', email, 'fonte', 'bio')),
       jsonb_build_object('valor', site, 'fonte', 'link'),
       base_ts - (((i % 4)::text) || ' days')::interval;
  end loop;

  -- conteúdos + alertas
  for k in 0..79 loop
    pid := pids[(k % 30) + 1];
    irregular := (k % 5 < 2) and (k < 70);
    if irregular then
      idx := ((k * 7) % 12) + 1;
      texto := irreg[idx];
      rule_code := irreg_rule[idx];
    else
      texto := reg[((k * 5) % 14) + 1];
    end if;
    tipo := tipos[(k % 5) + 1];
    curl := 'https://instagram.com/p/' || (1000 + k)::text;
    insert into public.content_items
      (profile_id, tipo, url, texto, hashtags, publicado_em, coletado_em, hash_conteudo)
    values
      (pid, tipo, curl, texto,
       coalesce(array(select mt[1] from regexp_matches(texto, '#\w+', 'g') as m(mt)), '{}'),
       base_ts - ((((k * 3) % 28)::text) || ' days')::interval - (((k % 10)::text) || ' hours')::interval,
       base_ts - ((((k * 3) % 28)::text) || ' days')::interval,
       encode(digest(pid::text || texto, 'sha256'), 'hex'))
    on conflict (profile_id, hash_conteudo) do nothing
    returning id into cid;

    if irregular and cid is not null then
      select r.id, r.nome, r.gravidade into rule_id, rule_nome, rule_grav
        from public.rules r where r.codigo = rule_code;
      st := statuses[(a % 10) + 1];
      a := a + 1;
      trecho := left(texto, 60);
      justif := 'Trecho "' || trecho || '" corresponde a padrão da regra '
                || rule_code || ' (' || rule_nome || '). Provimento 205/2021, art. 3º; CED, arts. 39 a 47.';
      insert into public.alerts
        (profile_id, content_item_id, rule_id, rule_versao, trecho_detectado,
         justificativa_ia, confianca, gravidade, status, seccional_uf, criado_em)
      values
        (pid, cid, rule_id, 1, trecho, justif, 0.86, rule_grav, st,
         (select uf_provavel from public.social_profiles where id = pid),
         (select coletado_em from public.content_items where id = cid))
      on conflict (content_item_id, rule_id) do nothing
      returning id into aid;

      if aid is not null then
        insert into public.alert_evidence
          (alert_id, url_original, texto_capturado, hash_sha256, capturado_em)
        values
          (aid, curl, texto, encode(digest(curl || texto, 'sha256'), 'hex'),
           (select coletado_em from public.content_items where id = cid));
        insert into public.alert_events (alert_id, tipo, texto, autor, criado_em)
        values
          (aid, 'status', 'Alerta criado automaticamente', 'Robô',
           (select coletado_em from public.content_items where id = cid));
        if st <> 'novo' then
          insert into public.alert_events (alert_id, tipo, texto, autor, criado_em)
          values
            (aid, 'status', 'Status alterado para ' || st, 'Analista Fictícia',
             (select coletado_em from public.content_items where id = cid));
        end if;
      end if;
      aid := null;
    end if;
    cid := null;
  end loop;

  -- risco_score: soma ponderada por gravidade (confirmados pesam 1, pendentes 0.5)
  update public.social_profiles p
  set risco_score = least(100, coalesce((
    select sum(r.peso_score * case when a.status in ('confirmado', 'encaminhado_ted') then 1.0 else 0.5 end)::int
    from public.alerts a
    join public.rules r on r.id = a.rule_id
    where a.profile_id = p.id
      and a.status in ('novo', 'em_analise', 'confirmado', 'encaminhado_ted')
  ), 0));
end $$;

-- ------------------------------------------------------- jobs de exemplo
insert into public.scan_jobs (tipo, status, inicio, fim, itens_processados, erros, custo_estimado)
select
  (array['descoberta','coleta','analise'])[(g % 3) + 1],
  case when g = 4 then 'falhou' else 'concluido' end,
  timestamptz '2026-10-14 12:00:00+00' - (((g * 6)::text) || ' hours')::interval,
  timestamptz '2026-10-14 12:00:00+00' - (((g * 6)::text) || ' hours')::interval + interval '9 minutes',
  20 + g * 9,
  case when g = 4 then array['Limite de requisições do provedor simulado'] else '{}' end,
  0
from generate_series(0, 7) g
where not exists (select 1 from public.scan_jobs limit 1);
