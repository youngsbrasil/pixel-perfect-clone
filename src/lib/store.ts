import { useSyncExternalStore } from "react";
import { toast } from "sonner";
import type {
  Alert, AlertStatus, AuditLog, ContentItem, DiscoverySource, LawyerData, Params, Rule, RuleVersion,
  ScanJob, Seccional, SocialProfile, UserRole,
} from "./types";
import { buildSeed, mkAlert, recomputeRisk, seedRules } from "./seed";
import { analyzeText, classifyLawyer, enrich, fakeHash } from "./engine";
import { mockProvider } from "./provider";
import { backendStatus, db, fetchRemoteState, type RemoteState } from "./remote";

export type Mode = "loading" | "local" | "remote";

export interface AppState {
  seccionais: Seccional[]; users: UserRole[]; currentUserId: string;
  profiles: SocialProfile[]; lawyers: LawyerData[]; contents: ContentItem[]; alerts: Alert[];
  rules: Rule[]; ruleVersions: RuleVersion[]; sources: DiscoverySource[]; jobs: ScanJob[]; audit: AuditLog[]; params: Params;
  mode: Mode; authed: boolean; authUserId: string | null;
}

const NOW = "2026-10-14T12:00:00.000Z";
function localSeed(): AppState {
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
    mode: "loading", authed: false, authUserId: null,
  };
}

let state: AppState = localSeed();
const listeners = new Set<() => void>();
const set = (fn: (d: AppState) => void) => { const d = structuredClone(state); fn(d); state = d; listeners.forEach((l) => l()); };
const sub = (l: () => void) => { listeners.add(l); return () => listeners.delete(l); };
export const useApp = () => useSyncExternalStore(sub, () => state, () => state);
export const getApp = () => state;
const isRemote = () => state.mode === "remote";

const now = () => new Date().toISOString();
const me = (d: AppState) => d.users.find((u) => u.id === d.currentUserId) ?? d.users[0]!;
const log = (d: AppState, acao: string, entidade: string, id: string) =>
  d.audit.unshift({ id: `l${d.audit.length + 1}-${Date.now()}`, user: me(d).nome, acao, entidade, entidade_id: id, em: now() });

/** Escopo por seccional (no modo remoto o RLS do banco já filtra; aqui é defesa em profundidade). */
export function scopeUF(s: AppState) { const u = s.users.find((x) => x.id === s.currentUserId); return !u || u.role === "admin_nacional" ? null : u.seccional_uf; }

/** Inicialização: tenta o Supabase; cai para demonstração local se indisponível. */
let booted = false;
export async function boot(force = false) {
  if (booted && !force) return; booted = true;
  const st = await backendStatus();
  if (st.backend && st.session) {
    const remote: (RemoteState & { authUserId: string }) | null = await fetchRemoteState() as any;
    if (remote) {
      state = { ...remote, mode: "remote", authed: true };
      listeners.forEach((l) => l());
      return;
    }
  }
  if (st.backend && !st.session) {
    set((d) => { d.mode = "remote"; d.authed = false; d.authUserId = null; });
    return;
  }
  set((d) => { d.mode = "local"; d.authed = false; });
}

export function onAuthChange(cb: (authed: boolean) => void) {
  try {
    const { data } = db.client().auth.onAuthStateChange((_e, session) => cb(!!session?.user));
    return () => data.subscription.unsubscribe();
  } catch { return () => {}; }
}

/** Persiste no Supabase em background (modo remoto). Falha vira toast, sem quebrar a UI. */
function persist(fn: () => Promise<void>) {
  if (!isRemote()) return;
  fn().catch((e) => {
    console.error("[remote persist]", e);
    toast.error("Falha ao salvar no servidor. Recarregue a página para sincronizar.");
  });
}

async function refreshAfterScan() {
  const remote = await fetchRemoteState() as (RemoteState & { authUserId: string }) | null;
  if (remote) { state = { ...remote, mode: "remote", authed: true }; listeners.forEach((l) => l()); }
}

export const actions = {
  switchUser: (id: string) => set((d) => { d.currentUserId = id; log(d, "troca de usuário", "sessao", id); }),

  setAlertStatus: (ids: string[], status: AlertStatus, motivo?: string) => {
    const autor = me(state).nome;
    const analistaId = state.authUserId;
    set((d) => {
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
    });
    persist(async () => {
      await db.setAlertStatus(ids, status, analistaId);
      await db.addAlertEvents(ids.map((id) => ({ alert_id: id, tipo: "status", texto: `Status: ${status}${motivo ? ` — ${motivo}` : ""}`, autor })));
      if (status === "falso_positivo") {
        const s = getApp();
        for (const id of ids) {
          const a = s.alerts.find((x) => x.id === id);
          const r = a && s.rules.find((x) => x.id === a.rule_id);
          const c = a && s.contents.find((x) => x.id === a.content_item_id);
          if (r && c) {
            await db.appendRuleNegativeExample(r.id, c.texto, r.versao);
            await db.insertRuleVersion(r.id, r.versao, autor, `Exemplo negativo adicionado (alerta ${id})`);
          }
        }
      }
      for (const id of ids) await db.audit(`status → ${status}`, "alerta", id);
    });
  },

  assign: (ids: string[], userId: string) => {
    const autor = me(state).nome;
    const nome = state.users.find((u) => u.id === userId)?.nome ?? userId;
    set((d) => {
      const u = d.users.find((x) => x.id === userId)!;
      for (const id of ids) { const a = d.alerts.find((x) => x.id === id); if (!a) continue; a.analista_id = userId; a.eventos.push({ em: now(), autor: me(d).nome, tipo: "atribuicao", texto: `Atribuído a ${u.nome}` }); log(d, "atribuição", "alerta", id); }
    });
    persist(async () => {
      await db.setAlertsAnalyst(ids, userId);
      await db.addAlertEvents(ids.map((id) => ({ alert_id: id, tipo: "atribuicao", texto: `Atribuído a ${nome}`, autor })));
      for (const id of ids) await db.audit("atribuição", "alerta", id);
    });
  },

  comment: (id: string, texto: string) => {
    const autor = me(state).nome;
    set((d) => { d.alerts.find((x) => x.id === id)?.eventos.push({ em: now(), autor: me(d).nome, tipo: "comentario", texto }); log(d, "comentário", "alerta", id); });
    persist(async () => {
      await db.addAlertEvents([{ alert_id: id, tipo: "comentario", texto, autor }]);
      await db.audit("comentário", "alerta", id);
    });
  },

  viewPersonalData: (profileId: string) => {
    set((d) => log(d, "acesso a dados pessoais", "perfil", profileId));
    persist(() => db.audit("acesso a dados pessoais", "perfil", profileId));
  },

  saveRule: async (r: Rule, mudanca: string) => {
    const autor = me(state).nome;
    if (isRemote()) {
      try {
        const cur = getApp().rules.find((x) => x.id === r.id);
        const versao = cur ? cur.versao + 1 : 1;
        const id = await db.upsertRule({ ...r, versao });
        await db.insertRuleVersion(id, versao, autor, mudanca);
        await db.audit(cur ? "edição de regra" : "criação de regra", "regra", r.codigo);
        const saved = { ...r, id, versao };
        set((d) => {
          const i = d.rules.findIndex((x) => x.id === id || x.codigo === r.codigo);
          if (i >= 0) d.rules[i] = saved; else d.rules.push(saved);
          d.ruleVersions.push({ rule_id: id, versao, autor, em: now(), mudanca });
          log(d, cur ? "edição de regra" : "criação de regra", "regra", r.codigo);
        });
        toast.success("Regra salva no servidor");
      } catch (e) { console.error(e); toast.error("Falha ao salvar a regra no servidor."); }
      return;
    }
    set((d) => {
      const i = d.rules.findIndex((x) => x.id === r.id);
      if (i >= 0) { r.versao = d.rules[i]!.versao + 1; d.rules[i] = r; } else { r.versao = 1; d.rules.push(r); }
      d.ruleVersions.push({ rule_id: r.id, versao: r.versao, autor: me(d).nome, em: now(), mudanca });
      log(d, i >= 0 ? "edição de regra" : "criação de regra", "regra", r.codigo);
    });
  },

  toggleRule: (id: string) => {
    const autor = me(state).nome;
    set((d) => { const r = d.rules.find((x) => x.id === id)!; r.ativo = !r.ativo; r.versao++; d.ruleVersions.push({ rule_id: id, versao: r.versao, autor: me(d).nome, em: now(), mudanca: r.ativo ? "Ativada" : "Desativada" }); log(d, "ativação/desativação", "regra", r.codigo); });
    persist(async () => {
      const r = getApp().rules.find((x) => x.id === id)!;
      await db.updateRule(id, { ativo: r.ativo, versao: r.versao });
      await db.insertRuleVersion(id, r.versao, autor, r.ativo ? "Ativada" : "Desativada");
      await db.audit("ativação/desativação", "regra", r.codigo);
    });
  },

  setProfileStatus: (id: string, st: SocialProfile["status_monitoramento"]) => {
    set((d) => { d.profiles.find((p) => p.id === id)!.status_monitoramento = st; log(d, `monitoramento → ${st}`, "perfil", id); });
    persist(async () => { await db.setProfileStatus(id, st); await db.audit(`monitoramento → ${st}`, "perfil", id); });
  },

  addSource: async (s: Omit<DiscoverySource, "id">) => {
    if (isRemote()) {
      try {
        const id = await db.addSource(s);
        await db.audit("nova fonte", "fonte", s.valor);
        set((d) => { d.sources.push({ ...s, id }); log(d, "nova fonte", "fonte", s.valor); });
        toast.success("Fonte salva no servidor");
      } catch (e) { console.error(e); toast.error("Falha ao salvar a fonte no servidor."); }
      return;
    }
    set((d) => { d.sources.push({ ...s, id: `s${Date.now()}${Math.random()}` }); log(d, "nova fonte", "fonte", s.valor); });
  },

  toggleSource: (id: string) => {
    set((d) => { const s = d.sources.find((x) => x.id === id)!; s.ativo = !s.ativo; });
    persist(async () => {
      const s = getApp().sources.find((x) => x.id === id)!;
      await db.toggleSource(id, s.ativo);
    });
  },

  removeSource: (id: string) => {
    set((d) => { d.sources = d.sources.filter((x) => x.id !== id); log(d, "remoção de fonte", "fonte", id); });
    persist(async () => { await db.removeSource(id); await db.audit("remoção de fonte", "fonte", id); });
  },

  setParams: (p: Params) => {
    set((d) => { d.params = p; log(d, "parâmetros alterados", "parametros", "global"); });
    persist(async () => { await db.setParams(p); await db.audit("parâmetros alterados", "parametros", "global"); });
  },

  setUserRole: (id: string, role: UserRole["role"], uf: string | null) => {
    set((d) => { const u = d.users.find((x) => x.id === id)!; u.role = role; u.seccional_uf = uf; log(d, `papel → ${role}`, "usuario", id); });
    persist(async () => { await db.setUserRole(id, role, uf); await db.audit(`papel → ${role}`, "usuario", id); });
  },

  signIn: async (email: string, password: string) => { await db.signIn(email, password); await boot(true); },
  signOut: async () => { await db.signOut(); await boot(true); },

  /** Varredura: no modo remoto chama as edge functions; no modo local roda o pipeline simulado. */
  async runScan(profileId?: string) {
    if (isRemote()) {
      const res = await db.runScan(profileId);
      await refreshAfterScan();
      const n = (res as any)?.alertas_criados ?? (res as any)?.novos ?? 0;
      return n as number;
    }
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

  /** Importa perfis reais a partir de URLs coladas pelo analista. */
  importProfiles: async (linhas: { url: string; bio?: string }[]) => {
    if (isRemote()) {
      const res = await db.importProfiles(linhas);
      await db.audit("importação de perfis", "fonte", `${res.novos} novo(s)`);
      await refreshAfterScan();
      return res;
    }
    // Modo local: parser simplificado.
    let novos = 0; const ignorados: { url: string; motivo: string }[] = [];
    const parseLocal = (u: string) => {
      const m = u.trim().match(/^https?:\/\/(?:www\.)?(instagram\.com|tiktok\.com|x\.com|twitter\.com|facebook\.com|youtube\.com|linkedin\.com)\/(@?[A-Za-z0-9._-]{1,60})/i);
      if (!m) return null;
      const host = (m[1] ?? "").toLowerCase();
      const rede = host.includes("instagram") ? "instagram" : host.includes("tiktok") ? "tiktok" : host.includes("face") ? "facebook" : host.includes("linkedin") ? "linkedin" : host.includes("youtu") ? "youtube" : "x";
      return { rede, username: (m[2] ?? "").replace(/^@/, "") };
    };
    set((d) => {
      for (const l of linhas) {
        const p = parseLocal(l.url);
        if (!p) { ignorados.push({ url: l.url, motivo: "URL não reconhecida" }); continue; }
        if (d.profiles.some((x) => x.rede === p.rede && x.username === p.username)) { ignorados.push({ url: l.url, motivo: "perfil já cadastrado" }); continue; }
        const bio = (l.bio || "");
        const cls = classifyLawyer(bio, "A verificar", []);
        if (cls.score < d.params.lawyer_score_min) { ignorados.push({ url: l.url, motivo: "bio sem sinais de advocacia" }); continue; }
        const e = enrich(bio, []);
        const id = `p${Date.now()}${novos}`;
        d.profiles.push({ id, rede: p.rede as never, username: p.username, url: l.url, nome_exibido: `@${p.username}`, bio, seguidores: 0, categoria_perfil: "A verificar", links_externos: [], lawyer_score: cls.score, sinais_identificacao: cls.sinais, uf_provavel: e.oab?.uf ?? "", status_monitoramento: "ativo", ultima_varredura: now(), risco_score: 0 });
        d.lawyers.push({ profile_id: id, nome_completo: `@${p.username}`, oab_numero: e.oab?.numero ?? null, oab_uf: e.oab?.uf ?? null, oab_validacao: "pendente", telefones: [], whatsapp: [], emails: [], site: null, coletado_em: now() });
        novos++;
      }
      d.jobs.unshift({ id: `j${Date.now()}`, tipo: "descoberta", status: "concluido", inicio: now(), fim: now(), itens_processados: novos, erros: [], custo_estimado: 0 });
      log(d, "importação de perfis", "fonte", `${novos} novo(s)`);
    });
    return { novos, ignorados };
  },
};
