import { useSyncExternalStore } from "react";
import type {
  Alert, AlertStatus, AuditLog, ContentItem, DiscoverySource, LawyerData, Params, Rule, RuleVersion,
  ScanJob, Seccional, SocialProfile, UserRole,
} from "./types";
import { buildSeed, mkAlert, recomputeRisk, seedRules } from "./seed";
import { analyzeText, classifyLawyer, enrich, fakeHash } from "./engine";
import { mockProvider } from "./provider";

export interface AppState {
  seccionais: Seccional[]; users: UserRole[]; currentUserId: string;
  profiles: SocialProfile[]; lawyers: LawyerData[]; contents: ContentItem[]; alerts: Alert[];
  rules: Rule[]; ruleVersions: RuleVersion[]; sources: DiscoverySource[]; jobs: ScanJob[]; audit: AuditLog[]; params: Params;
}

const NOW = "2026-10-14T12:00:00.000Z";
function init(): AppState {
  const s = buildSeed();
  return {
    seccionais: [{ uf: "SP", nome: "São Paulo" }, { uf: "RJ", nome: "Rio de Janeiro" }, { uf: "MG", nome: "Minas Gerais" }, { uf: "PE", nome: "Pernambuco" }, { uf: "RS", nome: "Rio Grande do Sul" }],
    users: [
      { id: "u1", nome: "Admin Nacional (fictício)", email: "nacional@exemplo.org", role: "admin_nacional", seccional_uf: null },
      { id: "u2", nome: "Admin SP (fictício)", email: "admin.sp@exemplo.org", role: "admin_seccional", seccional_uf: "SP" },
      { id: "u3", nome: "Analista Fictícia", email: "analista@exemplo.org", role: "analista", seccional_uf: "SP" },
      { id: "u4", nome: "Leitor RJ (fictício)", email: "leitor.rj@exemplo.org", role: "leitor", seccional_uf: "RJ" },
    ],
    currentUserId: "u1", ...s,
    rules: structuredClone(seedRules),
    ruleVersions: seedRules.map((r) => ({ rule_id: r.id, versao: 1, autor: "Sistema", em: NOW, mudanca: "Criação (seed)" })),
    sources: ["#advogado", "#advocacia", "#direitoprevidenciario", "#advogada", "OAB/", "advogada"].map((v, i) => ({
      id: `s${i + 1}`, tipo: v.startsWith("#") ? "hashtag" : "termo", valor: v, rede: i % 2 ? "tiktok" : "instagram", ativo: i !== 5,
    })),
    jobs: Array.from({ length: 8 }, (_, i) => ({
      id: `j${i + 1}`, tipo: (["descoberta", "coleta", "analise"] as const)[i % 3]!, status: i === 4 ? "falhou" : "concluido",
      inicio: new Date(Date.parse(NOW) - i * 6 * 3600000).toISOString(), fim: new Date(Date.parse(NOW) - i * 6 * 3600000 + 540000).toISOString(),
      itens_processados: 20 + i * 9, erros: i === 4 ? ["Limite de requisições do provedor simulado"] : [], custo_estimado: 0,
    })),
    audit: [], params: { limiar_global: 0.7, retencao_dias: 180, frequencia_horas: 6, lawyer_score_min: 60 },
  };
}

let state = init();
const listeners = new Set<() => void>();
const set = (fn: (d: AppState) => void) => { const d = structuredClone(state); fn(d); state = d; listeners.forEach((l) => l()); };
const sub = (l: () => void) => { listeners.add(l); return () => listeners.delete(l); };
export const useApp = () => useSyncExternalStore(sub, () => state, () => state);
export const getApp = () => state;

const now = () => new Date().toISOString();
const me = (d: AppState) => d.users.find((u) => u.id === d.currentUserId)!;
const log = (d: AppState, acao: string, entidade: string, id: string) =>
  d.audit.unshift({ id: `l${d.audit.length + 1}-${Date.now()}`, user: me(d).nome, acao, entidade, entidade_id: id, em: now() });

/** Escopo por seccional (espelha a futura RLS). */
export function scopeUF(s: AppState) { const u = s.users.find((x) => x.id === s.currentUserId)!; return u.role === "admin_nacional" ? null : u.seccional_uf; }

export const actions = {
  switchUser: (id: string) => set((d) => { d.currentUserId = id; log(d, "troca de usuário", "sessao", id); }),
  setAlertStatus: (ids: string[], status: AlertStatus, motivo?: string) => set((d) => {
    for (const id of ids) {
      const a = d.alerts.find((x) => x.id === id); if (!a) continue;
      a.status = status; a.analista_id = a.analista_id ?? d.currentUserId;
      a.eventos.push({ em: now(), autor: me(d).nome, tipo: "status", texto: `Status: ${status}${motivo ? ` — ${motivo}` : ""}` });
      if (status === "falso_positivo") {
        const r = d.rules.find((x) => x.id === a.rule_id); const c = d.contents.find((x) => x.id === a.content_item_id);
        if (r && c && !r.exemplos_negativos.includes(c.texto)) {
          r.exemplos_negativos.push(c.texto); r.versao++;
          d.ruleVersions.push({ rule_id: r.id, versao: r.versao, autor: me(d).nome, em: now(), mudanca: `Exemplo negativo adicionado (alerta ${a.id})` });
        }
      }
      log(d, `status → ${status}`, "alerta", id);
    }
    recomputeRisk(d.profiles, d.alerts, d.rules);
  }),
  assign: (ids: string[], userId: string) => set((d) => {
    const u = d.users.find((x) => x.id === userId)!;
    for (const id of ids) { const a = d.alerts.find((x) => x.id === id); if (!a) continue; a.analista_id = userId; a.eventos.push({ em: now(), autor: me(d).nome, tipo: "atribuicao", texto: `Atribuído a ${u.nome}` }); log(d, "atribuição", "alerta", id); }
  }),
  comment: (id: string, texto: string) => set((d) => { d.alerts.find((x) => x.id === id)?.eventos.push({ em: now(), autor: me(d).nome, tipo: "comentario", texto }); log(d, "comentário", "alerta", id); }),
  viewPersonalData: (profileId: string) => set((d) => log(d, "acesso a dados pessoais", "perfil", profileId)),
  saveRule: (r: Rule, mudanca: string) => set((d) => {
    const i = d.rules.findIndex((x) => x.id === r.id);
    if (i >= 0) { r.versao = d.rules[i].versao + 1; d.rules[i] = r; } else { r.versao = 1; d.rules.push(r); }
    d.ruleVersions.push({ rule_id: r.id, versao: r.versao, autor: me(d).nome, em: now(), mudanca });
    log(d, i >= 0 ? "edição de regra" : "criação de regra", "regra", r.codigo);
  }),
  toggleRule: (id: string) => set((d) => { const r = d.rules.find((x) => x.id === id)!; r.ativo = !r.ativo; r.versao++; d.ruleVersions.push({ rule_id: id, versao: r.versao, autor: me(d).nome, em: now(), mudanca: r.ativo ? "Ativada" : "Desativada" }); log(d, "ativação/desativação", "regra", r.codigo); }),
  setProfileStatus: (id: string, st: SocialProfile["status_monitoramento"]) => set((d) => { d.profiles.find((p) => p.id === id)!.status_monitoramento = st; log(d, `monitoramento → ${st}`, "perfil", id); }),
  addSource: (s: Omit<DiscoverySource, "id">) => set((d) => { d.sources.push({ ...s, id: `s${Date.now()}${Math.random()}` }); log(d, "nova fonte", "fonte", s.valor); }),
  toggleSource: (id: string) => set((d) => { const s = d.sources.find((x) => x.id === id)!; s.ativo = !s.ativo; }),
  removeSource: (id: string) => set((d) => { d.sources = d.sources.filter((x) => x.id !== id); log(d, "remoção de fonte", "fonte", id); }),
  setParams: (p: Params) => set((d) => { d.params = p; log(d, "parâmetros alterados", "parametros", "global"); }),
  setUserRole: (id: string, role: UserRole["role"], uf: string | null) => set((d) => { const u = d.users.find((x) => x.id === id)!; u.role = role; u.seccional_uf = uf; log(d, `papel → ${role}`, "usuario", id); }),

  /** Pipeline simulado: descoberta → classificação → enriquecimento → coleta → análise → risco. */
  async runScan(profileId?: string) {
    const s = getApp(); const inicio = now(); let itens = 0;
    let found = profileId ? [] : await mockProvider.discoverProfiles(s.sources);
    const targets = profileId ? s.profiles.filter((p) => p.id === profileId) : [];
    set((d) => {
      for (const f of found) {
        const cls = classifyLawyer(f.bio, f.categoria_perfil, f.links_externos);
        if (cls.score < d.params.lawyer_score_min) continue;
        const e = enrich(f.bio, f.links_externos); const id = `p${Date.now()}${itens}`;
        d.profiles.push({ ...f, id, lawyer_score: cls.score, sinais_identificacao: cls.sinais, uf_provavel: e.oab?.uf ?? "SP", status_monitoramento: "ativo", ultima_varredura: now(), risco_score: 0 });
        d.lawyers.push({ profile_id: id, nome_completo: f.nome_exibido, oab_numero: e.oab?.numero ?? null, oab_uf: e.oab?.uf ?? null, oab_validacao: "pendente", telefones: e.telefones, whatsapp: e.whatsapp, emails: e.emails, site: e.site, coletado_em: now() });
        targets.push(d.profiles[d.profiles.length - 1]!); itens++;
      }
    });
    found = [];
    for (const t of targets) {
      const posts = await mockProvider.fetchPosts(t.rede, t.username);
      set((d) => {
        const p = d.profiles.find((x) => x.id === t.id)!; p.ultima_varredura = now();
        for (const post of posts) {
          const hash = fakeHash(p.id + post.texto); if (d.contents.some((c) => c.hash_conteudo === hash)) continue;
          const c: ContentItem = { id: `c${Date.now()}${itens}`, profile_id: p.id, tipo: post.tipo, url: post.url, texto: post.texto, hashtags: post.hashtags, publicado_em: post.publicado_em, coletado_em: now(), hash_conteudo: hash };
          d.contents.push(c); itens++;
          for (const m of analyzeText(c.texto, d.rules, p.rede)) {
            if (d.alerts.some((a) => a.content_item_id === c.id && a.rule_id === m.rule.id)) continue;
            d.alerts.push(mkAlert(`a${d.alerts.length + 1}-${Date.now()}`, c, p, m, "novo", now()));
          }
        }
        recomputeRisk(d.profiles, d.alerts, d.rules);
      });
    }
    set((d) => { d.jobs.unshift({ id: `j${Date.now()}`, tipo: profileId ? "coleta" : "descoberta", status: "concluido", inicio, fim: now(), itens_processados: itens, erros: [], custo_estimado: 0 }); log(d, "varredura executada", "scan_job", profileId ?? "global"); });
    return itens;
  },
};
