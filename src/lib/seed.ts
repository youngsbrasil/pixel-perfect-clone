import type {
  Alert, AlertStatus, AppStateBase, ContentItem, LawyerData, Rede, Rule, SocialProfile,
} from "./seed-types";
import { analyzeText, classifyLawyer, enrich, fakeHash } from "./engine";

const BASE = Date.UTC(2026, 9, 14, 12);
const dayIso = (d: number, h = 0) => new Date(BASE - d * 86400000 - h * 3600000).toISOString();
const FUND = "Provimento 205/2021, art. 3º; CED, arts. 39 a 47";

const R = (o: Partial<Rule> & Pick<Rule, "codigo" | "nome" | "padroes" | "gravidade">, i: number): Rule => ({
  id: `r${i}`, descricao: "", categoria: o.codigo.split("-")[0]!, fundamento_normativo: FUND,
  tipo_deteccao: "palavra_chave", exemplos_positivos: [], exemplos_negativos: [], peso_score: o.gravidade === "alta" ? 30 : o.gravidade === "media" ? 15 : 5,
  limiar_confianca: 0.7, redes_aplicaveis: [], escopo: "nacional", ativo: true, versao: 1, ...o,
});

export const seedRules: Rule[] = [
  { codigo: "CAP-01", nome: "Chamada para contato privado", gravidade: "alta" as const,
    descricao: "Convite para que o público inicie contato privado visando contratação.",
    padroes: ["chama no direct", "chama na dm", "me manda dm", "me manda uma dm", "te mando mais informacoes no direct", "chama no zap", "chama no whats", "chama no inbox", "me chama no privado"],
    exemplos_positivos: ["Teve o benefício negado? Chama no direct!", "Me manda DM que te explico como resolver", "Dúvidas? Chama no zap"],
    exemplos_negativos: ["Não respondo consultas pelo direct; procure a Defensoria.", "O golpe do falso advogado começa com mensagens no direct."] },
  { codigo: "CAP-02", nome: "Comente e receba", gravidade: "alta" as const, descricao: "Mecânica de engajamento condicionando envio de material/atendimento.",
    padroes: ["comente quero", "comenta eu quero", "comente eu quero", "comente e receba", "comenta que eu te envio"],
    exemplos_positivos: ["Comente QUERO e receba o modelo", "Comenta EU QUERO que eu te envio", "Comente e receba o guia"],
    exemplos_negativos: ["Comente qual tema vocês querem ver na próxima aula.", "Deixe nos comentários sua opinião sobre a decisão do STF."] },
  { codigo: "CAP-03", nome: "Clique e fale comigo", gravidade: "media" as const, descricao: "Direcionamento para canal de contato com fim de captação.",
    padroes: ["clique no link e fale comigo", "link na bio para falar comigo", "fale comigo pelo link"],
    exemplos_positivos: ["Clique no link e fale comigo agora", "Link na bio para falar comigo", "Fale comigo pelo link"],
    exemplos_negativos: ["O link na bio leva ao artigo completo.", "Clique no link para ler a íntegra da lei."] },
  { codigo: "CAP-04", nome: "Oferta direta de consulta", gravidade: "media" as const, descricao: "Oferta ativa de serviços ao público indeterminado.",
    padroes: ["agende sua consulta", "agende ja sua consulta", "atendo todo o brasil"],
    exemplos_positivos: ["Agende sua consulta hoje", "Atendo todo o Brasil, me chama", "Agende já sua consulta"],
    exemplos_negativos: ["Escritório com atuação nacional em direito tributário.", "Atendimento mediante agendamento."] },
  { codigo: "MER-01", nome: "Preço e gratuidade", gravidade: "alta" as const, tipo_deteccao: "regex" as const, descricao: "Divulgação de preços, gratuidade ou condições de pagamento.",
    padroes: ["consulta gratis", "primeira consulta gratuita", "consulta gratuita", "honorarios a partir de r\\$", "parcelo em \\d+ ?(x|vezes)", "so paga se ganhar"],
    exemplos_positivos: ["Primeira consulta gratuita!", "Honorários a partir de R$ 500", "Só paga se ganhar"],
    exemplos_negativos: ["A tabela de honorários da OAB é referência mínima.", "Quem não pode pagar tem direito à assistência gratuita."] },
  { codigo: "MER-02", nome: "Promoções e sorteios", gravidade: "media" as const, descricao: "Uso de mecânicas mercantis.",
    padroes: ["sorteio", "promocao", "cupom", "black friday"],
    exemplos_positivos: ["Sorteio de uma consulta", "Promoção de inventário", "Black Friday jurídica"],
    exemplos_negativos: ["Fraude em sorteios de rifas: o que diz a lei.", "Direitos do consumidor na Black Friday."] },
  { codigo: "RES-01", nome: "Promessa de resultado", gravidade: "alta" as const, descricao: "Garantia ou promessa de êxito.",
    padroes: ["causa ganha", "resultado garantido", "100% de exito", "vitoria garantida"],
    exemplos_positivos: ["Causa ganha, pode confiar", "Resultado garantido", "100% de êxito"],
    exemplos_negativos: ["Nenhum advogado pode garantir resultado.", "Não existe causa ganha antes da sentença."] },
  { codigo: "RES-02", nome: "Divulgação de valores/casos", gravidade: "media" as const, tipo_deteccao: "regex" as const, descricao: "Exposição de valores obtidos ou casos concretos.",
    padroes: ["consegui r\\$ ?[\\d.,]+", "ganhamos r\\$ ?[\\d.,]+", "alvara de r\\$"],
    exemplos_positivos: ["Consegui R$ 85.000 para minha cliente", "Ganhamos R$ 120 mil", "Alvará de R$ 40.000 liberado"],
    exemplos_negativos: ["O teto do INSS em 2026 é de R$ 8.000.", "Entenda como é calculado o valor da causa."] },
  { codigo: "AUT-01", nome: "Autoengrandecimento", gravidade: "baixa" as const, descricao: "Expressões de superioridade.",
    padroes: ["o melhor advogado", "a melhor advogada", "numero 1 em", "n 1 em"],
    exemplos_positivos: ["O melhor advogado da cidade", "Número 1 em revisão", "A melhor advogada de família"],
    exemplos_negativos: ["Como escolher um advogado de confiança.", "O melhor caminho é a conciliação."] },
  { codigo: "URG-01", nome: "Apelo de urgência", gravidade: "baixa" as const, descricao: "Pressão temporal para contratação.",
    padroes: ["ultimas vagas", "nao perca seu direito", "me chama agora", "so hoje"],
    exemplos_positivos: ["Últimas vagas para revisão", "Não perca seu direito, me chama agora", "Só hoje!"],
    exemplos_negativos: ["O prazo prescricional é de 5 anos.", "Atenção ao prazo de recurso."] },
].map((o, i) => R(o as never, i + 1));

const UFS = ["SP", "RJ", "MG", "PE", "RS"];
const NOMES = ["Ana", "Bruno", "Carla", "Diego", "Elisa", "Fábio", "Gabriela", "Heitor", "Isabela", "João", "Karina", "Lucas", "Marina", "Nicolas", "Olívia"];
const AREAS = ["Direito Previdenciário", "Direito de Família", "Direito Trabalhista", "Direito do Consumidor", "Direito Criminal", "Direito Tributário"];
const REDES: Rede[] = ["instagram", "instagram", "tiktok", "facebook", "linkedin", "youtube", "x"];

const IRREG = [
  "Teve o benefício negado pelo INSS? Chama no direct que eu resolvo! #direitoprevidenciario",
  "Comente QUERO e eu te envio o checklist da aposentadoria especial.",
  "Primeira consulta gratuita só esta semana. Agende sua consulta! #advogado",
  "Consegui R$ 85.000 para minha cliente em ação trabalhista! 🙌",
  "Divórcio rápido, resultado garantido. Me chama agora!",
  "Black Friday jurídica: cupom de 30% em inventários.",
  "Sou o melhor advogado de família da região. Link na bio para falar comigo.",
  "Últimas vagas para revisão da vida toda. Não perca seu direito!",
  "Honorários a partir de R$ 300, parcelo em 10x. Chama no zap!",
  "Atendo todo o Brasil, me chama no privado.",
  "Sorteio de uma consulta para quem seguir o perfil e marcar 3 amigos!",
  "Só paga se ganhar! Causa ganha em ações contra bancos.",
];
const REG = [
  "Hoje explico a diferença entre guarda compartilhada e unilateral. #advocacia",
  "Você sabia que o prazo para reclamar verbas trabalhistas é de 2 anos após o fim do contrato?",
  "Nenhum advogado pode garantir resultado. Desconfie de promessas!",
  "Resumo da decisão do STJ sobre superendividamento.",
  "Participei hoje do congresso de Direito Previdenciário da Seccional.",
  "O golpe do falso advogado começa com mensagens no direct. Cuidado!",
  "Direitos do consumidor na Black Friday: guarde os comprovantes.",
  "Leitura recomendada: Código de Ética e Disciplina da OAB.",
  "Entenda como funciona a pensão por morte após a reforma.",
  "Quem não pode pagar tem direito à assistência gratuita pela Defensoria.",
  "Dica: guarde sempre os holerites e o extrato do FGTS.",
  "Feliz Dia do Advogado a todos os colegas!",
  "Como é calculada a revisão do FGTS? Explico no carrossel.",
  "Fraude em sorteios de rifas: o que diz a lei.",
];

export function buildSeed() {
  const profiles: SocialProfile[] = []; const lawyers: LawyerData[] = []; const contents: ContentItem[] = [];
  for (let i = 0; i < 30; i++) {
    const nome = NOMES[i % NOMES.length]!; const uf = UFS[i % 5]!; const fem = /a$/.test(nome);
    const area = AREAS[i % AREAS.length]!; const rede = REDES[i % REDES.length]!;
    const username = `${fem ? "dra" : "dr"}.${nome.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")}.exemplo${i + 1}`;
    const oabNum = `${(120 + i * 7) % 900}.${(100 + i * 13) % 900}`;
    const oabStyle = i % 3 === 0 ? `OAB/${uf} ${oabNum}` : i % 3 === 1 ? `OAB-${uf} nº ${oabNum.replace(".", "")}` : `OAB ${oabNum.replace(".", "")}/${uf}`;
    const bio = i % 7 === 6
      ? `${fem ? "Dra." : "Dr."} ${nome} Exemplo · ${area} · conteúdo fictício`
      : `${fem ? "Advogada" : "Advogado"} | ${oabStyle} | ${area} | (11) 9${String(8000 + i).padStart(4, "0")}-${String(1000 + i * 3)} | contato${i + 1}@exemplo-ficticio.adv.br`;
    const links = [`https://wa.me/55119${String(80000000 + i * 1111)}`, `https://${nome.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")}exemplo.adv.br`];
    const cat = i % 4 === 3 ? "Criador de conteúdo" : fem ? "Advogada" : "Advogado";
    const cls = classifyLawyer(bio, cat, links);
    const id = `p${i + 1}`;
    profiles.push({
      id, rede, username, url: `https://${rede}.com/${username}`, nome_exibido: `${fem ? "Dra." : "Dr."} ${nome} Exemplo`,
      bio, seguidores: 800 + ((i * 7919) % 90000), categoria_perfil: cat, links_externos: links,
      lawyer_score: cls.score, sinais_identificacao: cls.sinais, uf_provavel: uf,
      status_monitoramento: i === 28 ? "pausado" : i === 29 ? "ignorado" : "ativo",
      ultima_varredura: dayIso(i % 4, i % 12), risco_score: 0,
    });
    const e = enrich(bio, links);
    lawyers.push({
      profile_id: id, nome_completo: `${nome} Exemplo da Silva (fictício)`, oab_numero: e.oab?.numero ?? null, oab_uf: e.oab?.uf ?? null,
      oab_validacao: !e.oab ? "nao_encontrada" : (["pendente", "valida", "valida", "divergente"] as const)[i % 4]!,
      telefones: e.telefones, whatsapp: e.whatsapp, emails: e.emails, site: e.site, coletado_em: dayIso(i % 4),
    });
  }
  for (let k = 0; k < 80; k++) {
    const p = profiles[k % 30]!; const irregular = k % 5 < 2 && k < 70;
    const texto = irregular ? IRREG[(k * 7) % IRREG.length]! : REG[(k * 5) % REG.length]!;
    const tipo = (["post", "reels", "post", "story", "bio"] as const)[k % 5]!;
    contents.push({
      id: `c${k + 1}`, profile_id: p.id, tipo, url: `${p.url}/p/${1000 + k}`, texto,
      hashtags: texto.match(/#\w+/g) ?? [], publicado_em: dayIso((k * 3) % 28, k % 10), coletado_em: dayIso((k * 3) % 28),
      hash_conteudo: fakeHash(p.id + texto),
    });
  }
  const statusCycle: AlertStatus[] = ["novo", "novo", "em_analise", "confirmado", "novo", "falso_positivo", "encaminhado_ted", "em_analise", "arquivado", "confirmado"];
  const alerts: Alert[] = []; let a = 0;
  for (const c of contents) {
    const p = profiles.find((x) => x.id === c.profile_id)!;
    for (const m of analyzeText(c.texto, seedRules).slice(0, 1)) {
      const status = statusCycle[a % statusCycle.length]!;
      alerts.push(mkAlert(`a${++a}`, c, p, m, status, c.coletado_em));
    }
  }
  recomputeRisk(profiles, alerts, seedRules);
  return { profiles, lawyers, contents, alerts } satisfies Partial<AppStateBase>;
}

export function mkAlert(id: string, c: ContentItem, p: SocialProfile, m: ReturnType<typeof analyzeText>[number], status: AlertStatus, em: string): Alert {
  return {
    id, profile_id: p.id, content_item_id: c.id, rule_id: m.rule.id, rule_versao: m.rule.versao,
    trecho_detectado: m.trecho, justificativa_ia: m.justificativa, confianca: m.confianca, gravidade: m.rule.gravidade,
    status, analista_id: status === "novo" ? null : "u3", seccional_uf: p.uf_provavel, criado_em: em,
    evidencia: { screenshot_url: null, url_original: c.url, texto_capturado: c.texto, hash_sha256: fakeHash(c.url + c.texto), capturado_em: em },
    eventos: [{ em, autor: "Robô", tipo: "status", texto: "Alerta criado automaticamente" },
      ...(status !== "novo" ? [{ em, autor: "Analista Fictícia", tipo: "status" as const, texto: `Status alterado para ${status}` }] : [])],
  };
}

export function recomputeRisk(profiles: SocialProfile[], alerts: Alert[], rules: Rule[]) {
  for (const p of profiles) {
    const s = alerts.filter((x) => x.profile_id === p.id && ["novo", "em_analise", "confirmado", "encaminhado_ted"].includes(x.status))
      .reduce((acc, x) => acc + (rules.find((r) => r.id === x.rule_id)?.peso_score ?? 10) * (x.status === "confirmado" || x.status === "encaminhado_ted" ? 1 : 0.5), 0);
    p.risco_score = Math.min(100, Math.round(s));
  }
}
