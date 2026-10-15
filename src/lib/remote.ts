// Camada de dados remota (Supabase). Mapeia as tabelas para os tipos de src/lib/types.ts.
// O RLS no banco faz o escopo por seccional; aqui só convertemos formatos.
import { supabase } from "@/integrations/supabase/client";
import type {
  Alert, AlertEvent, AlertStatus, AuditLog, ContentItem, DiscoverySource,
  LawyerData, Params, Rule, RuleVersion, ScanJob, Seccional, SocialProfile, UserRole,
} from "./types";

export interface RemoteState {
  seccionais: Seccional[];
  users: UserRole[];
  currentUserId: string;
  /** auth.users.id do usuário logado (para analista_id etc.) */
  authUserId: string;
  profiles: SocialProfile[];
  lawyers: LawyerData[];
  contents: ContentItem[];
  alerts: Alert[];
  rules: Rule[];
  ruleVersions: RuleVersion[];
  sources: DiscoverySource[];
  jobs: ScanJob[];
  audit: AuditLog[];
  params: Params;
}

const num = (v: unknown, d = 0) => (typeof v === "number" ? v : Number(v) || d);

function toLawyer(r: any): LawyerData {
  const dp = (a: any[]) => (Array.isArray(a) ? a.map((x) => ({ valor: String(x?.valor ?? ""), fonte: String(x?.fonte ?? "") })) : []);
  return {
    profile_id: r.profile_id, nome_completo: r.nome_completo ?? "", oab_numero: r.oab_numero,
    oab_uf: r.oab_uf, oab_validacao: r.oab_validacao ?? "pendente",
    telefones: dp(r.telefones), whatsapp: dp(r.whatsapp), emails: dp(r.emails),
    site: r.site ? { valor: String(r.site.valor ?? ""), fonte: String(r.site.fonte ?? "") } : null,
    coletado_em: r.coletado_em,
  };
}

/** Status do backend: há sessão? as tabelas existem? Nunca lança exceção. */
export async function backendStatus(): Promise<{ session: boolean; backend: boolean }> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const probe = await supabase.from("seccionais").select("uf").limit(1);
    return { session: !!session?.user, backend: !probe.error };
  } catch {
    return { session: false, backend: false };
  }
}

/** Tenta carregar tudo do Supabase. Retorna null se o backend não estiver acessível. */
export async function fetchRemoteState(): Promise<RemoteState | null> {
  let sb: typeof supabase;
  try { sb = supabase; void sb.auth; } catch { return null; }
  try {
    const { data: { session } } = await sb.auth.getSession();
    if (!session?.user) return null;
    // Checagem de disponibilidade: se as tabelas não existirem, cai para o modo local.
    const probe = await sb.from("seccionais").select("uf").limit(1);
    if (probe.error) return null;

    const [sec, roles, prof, law, cont, rul, rver, ale, evi, eve, src, job, aud, par] = await Promise.all([
      sb.from("seccionais").select("*").order("uf"),
      sb.from("user_roles").select("*").order("email"),
      sb.from("social_profiles").select("*").order("created_at", { ascending: false }).limit(500),
      sb.from("lawyer_data").select("*"),
      sb.from("content_items").select("*").order("coletado_em", { ascending: false }).limit(1000),
      sb.from("rules").select("*").order("codigo"),
      sb.from("rule_versions").select("*").order("criado_em", { ascending: false }).limit(500),
      sb.from("alerts").select("*").order("criado_em", { ascending: false }).limit(1000),
      sb.from("alert_evidence").select("*"),
      sb.from("alert_events").select("*").order("criado_em"),
      sb.from("discovery_sources").select("*").order("valor"),
      sb.from("scan_jobs").select("*").order("inicio", { ascending: false }).limit(50),
      sb.from("audit_logs").select("*").order("criado_em", { ascending: false }).limit(200),
      sb.from("app_params").select("*").eq("id", 1).maybeSingle(),
    ]);
    const err = [sec, roles, prof, law, cont, rul, rver, ale, evi, eve, src, job, aud].find((r) => r.error);
    if (err?.error) throw err.error;

    const users: UserRole[] = (roles.data ?? []).map((u: any) => ({
      id: u.id, nome: u.nome ?? u.email ?? "—", email: u.email ?? "",
      role: u.role, seccional_uf: u.seccional_uf ?? null,
    }));
    const me = users.find((u) => (u as any).user_id === session.user.id)
      ?? (roles.data ?? []).find((u: any) => u.user_id === session.user.id);
    const myRow: any = (roles.data ?? []).find((u: any) => u.user_id === session.user.id);
    const currentUserId = myRow?.id ?? users[0]?.id ?? "";

    const evByAlert = new Map<string, any>();
    for (const e of evi.data ?? []) if (!evByAlert.has(e.alert_id)) evByAlert.set(e.alert_id, e);
    const evtsByAlert = new Map<string, AlertEvent[]>();
    for (const e of eve.data ?? []) {
      const l = evtsByAlert.get(e.alert_id) ?? [];
      l.push({ em: e.criado_em, autor: e.autor ?? "", tipo: e.tipo as AlertEvent["tipo"], texto: e.texto ?? "" });
      evtsByAlert.set(e.alert_id, l);
    }
    const userName = (id: string | null) => users.find((u) => (u as any).user_id === id)?.nome
      ?? users.find((u) => u.id === id)?.nome ?? "—";

    const alerts: Alert[] = (ale.data ?? []).map((a: any) => {
      const ev = evByAlert.get(a.id);
      return {
        id: a.id, profile_id: a.profile_id, content_item_id: a.content_item_id, rule_id: a.rule_id,
        rule_versao: a.rule_versao ?? 1, trecho_detectado: a.trecho_detectado ?? "",
        justificativa_ia: a.justificativa_ia ?? "", confianca: num(a.confianca), gravidade: a.gravidade,
        status: a.status as AlertStatus, analista_id: a.analista_id, seccional_uf: a.seccional_uf,
        criado_em: a.criado_em,
        evidencia: {
          screenshot_url: ev?.screenshot_url ?? null, url_original: ev?.url_original ?? "",
          texto_capturado: ev?.texto_capturado ?? "", hash_sha256: ev?.hash_sha256 ?? "",
          capturado_em: ev?.capturado_em ?? a.criado_em,
        },
        eventos: evtsByAlert.get(a.id) ?? [],
      };
    });

    return {
      seccionais: (sec.data ?? []) as Seccional[],
      users, currentUserId, authUserId: session.user.id,
      profiles: (prof.data ?? []) as SocialProfile[],
      lawyers: (law.data ?? []).map(toLawyer),
      contents: (cont.data ?? []) as ContentItem[],
      alerts,
      rules: (rul.data ?? []).map((r: any) => ({ ...r, limiar_confianca: num(r.limiar_confianca, 0.7) })) as Rule[],
      ruleVersions: (rver.data ?? []).map((v: any) => ({
        rule_id: v.rule_id, versao: v.versao, autor: v.autor ?? "", em: v.criado_em, mudanca: v.mudanca ?? "",
      })) as RuleVersion[],
      sources: (src.data ?? []) as DiscoverySource[],
      jobs: (job.data ?? []).map((j: any) => ({
        id: j.id, tipo: j.tipo, status: j.status, inicio: j.inicio, fim: j.fim,
        itens_processados: j.itens_processados ?? 0, erros: j.erros ?? [], custo_estimado: num(j.custo_estimado),
      })) as ScanJob[],
      audit: (aud.data ?? []).map((l: any) => ({
        id: l.id, user: userName(l.user_id), acao: l.acao, entidade: l.entidade ?? "",
        entidade_id: l.entidade_id ?? "", em: l.criado_em,
      })) as AuditLog[],
      params: par.data ? {
        limiar_global: num(par.data.limiar_global, 0.7), retencao_dias: par.data.retencao_dias ?? 180,
        frequencia_horas: par.data.frequencia_horas ?? 6, lawyer_score_min: par.data.lawyer_score_min ?? 60,
      } : { limiar_global: 0.7, retencao_dias: 180, frequencia_horas: 6, lawyer_score_min: 60 },
    };
  } catch {
    return null;
  }
}

/** Operações de escrita no Supabase (modo remoto). Falhas viram exceção. */
export const db = {
  client: () => supabase,
  async signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  },
  async signOut() { await supabase.auth.signOut(); },

  async setAlertStatus(ids: string[], status: AlertStatus, analistaId: string | null) {
    const { error } = await supabase.from("alerts").update({ status, analista_id: analistaId }).in("id", ids);
    if (error) throw error;
  },
  async addAlertEvents(rows: { alert_id: string; tipo: string; texto: string; autor: string }[]) {
    const { error } = await supabase.from("alert_events").insert(rows);
    if (error) throw error;
  },
  async appendRuleNegativeExample(ruleId: string, texto: string, versao: number) {
    const { data, error } = await supabase.from("rules").select("exemplos_negativos").eq("id", ruleId).single();
    if (error) throw error;
    const cur: string[] = (data as any).exemplos_negativos ?? [];
    if (!cur.includes(texto)) {
      const { error: e2 } = await supabase.from("rules")
        .update({ exemplos_negativos: [...cur, texto], versao }).eq("id", ruleId);
      if (e2) throw e2;
    }
  },
  async insertRuleVersion(ruleId: string, versao: number, autor: string, mudanca: string) {
    const { error } = await supabase.from("rule_versions").insert({ rule_id: ruleId, versao, autor, mudanca });
    if (error) throw error;
  },
  async upsertRule(r: Rule): Promise<string> {
    const payload: any = {
      codigo: r.codigo, nome: r.nome, descricao: r.descricao, categoria: r.categoria,
      fundamento_normativo: r.fundamento_normativo, tipo_deteccao: r.tipo_deteccao,
      padroes: r.padroes, exemplos_positivos: r.exemplos_positivos, exemplos_negativos: r.exemplos_negativos,
      gravidade: r.gravidade, peso_score: r.peso_score, limiar_confianca: r.limiar_confianca,
      redes_aplicaveis: r.redes_aplicaveis, escopo: r.escopo, ativo: r.ativo, versao: r.versao,
    };
    if (/^[0-9a-f-]{36}$/i.test(r.id)) {
      const { error } = await supabase.from("rules").update(payload).eq("id", r.id);
      if (error) throw error;
      return r.id;
    }
    const { data, error } = await supabase.from("rules").insert(payload).select("id").single();
    if (error) throw error;
    return (data as any).id as string;
  },
  async setProfileStatus(id: string, status: string) {
    const { error } = await supabase.from("social_profiles").update({ status_monitoramento: status }).eq("id", id);
    if (error) throw error;
  },
  async setAlertsAnalyst(ids: string[], analistaId: string | null) {
    const { error } = await supabase.from("alerts").update({ analista_id: analistaId }).in("id", ids);
    if (error) throw error;
  },
  async updateRule(id: string, patch: { ativo: boolean; versao: number }) {
    const { error } = await supabase.from("rules").update(patch).eq("id", id);
    if (error) throw error;
  },
  async addSource(s: Omit<DiscoverySource, "id">): Promise<string> {
    const { data, error } = await supabase.from("discovery_sources")
      .insert({ tipo: s.tipo, valor: s.valor, rede: s.rede, ativo: s.ativo }).select("id").single();
    if (error) throw error;
    return (data as any).id as string;
  },
  async toggleSource(id: string, ativo: boolean) {
    const { error } = await supabase.from("discovery_sources").update({ ativo }).eq("id", id);
    if (error) throw error;
  },
  async removeSource(id: string) {
    const { error } = await supabase.from("discovery_sources").delete().eq("id", id);
    if (error) throw error;
  },
  async setParams(p: Params) {
    const { error } = await supabase.from("app_params").update({
      limiar_global: p.limiar_global, retencao_dias: p.retencao_dias,
      frequencia_horas: p.frequencia_horas, lawyer_score_min: p.lawyer_score_min,
    }).eq("id", 1);
    if (error) throw error;
  },
  async setUserRole(id: string, role: UserRole["role"], uf: string | null) {
    const { error } = await supabase.from("user_roles").update({ role, seccional_uf: uf }).eq("id", id);
    if (error) throw error;
  },
  async audit(acao: string, entidade: string, entidade_id: string) {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("audit_logs").insert({ user_id: user?.id ?? null, acao, entidade, entidade_id });
  },
  async runScan(profileId?: string) {
    const { data, error } = await supabase.functions.invoke("run-scan", { body: { profile_id: profileId ?? null } });
    if (error) throw error;
    return data;
  },
  /** Importa perfis reais (URLs coladas pelo analista) via discover-profiles. */
  async importProfiles(perfis: { url: string; bio?: string; nome_exibido?: string }[]) {
    const { data, error } = await supabase.functions.invoke("discover-profiles", {
      body: { acao: "importar", perfis },
    });
    if (error) throw error;
    return data as { novos: number; ignorados: { url: string; motivo: string }[] };
  },
  /** Coleta assistida: registra conteúdos reais de um perfil. */
  async addContent(profileId: string, itens: { url?: string; texto: string; tipo?: string }[]) {
    const { data, error } = await supabase.functions.invoke("collect-content", {
      body: { profile_id: profileId, itens },
    });
    if (error) throw error;
    return data as { novos: number; ignorados: number };
  },
  /** Analisa os conteúdos de um perfil (gera alertas). */
  async analyzeProfile(profileId: string) {
    const { data, error } = await supabase.functions.invoke("analyze-content", {
      body: { profile_id: profileId },
    });
    if (error) throw error;
    return data as { analisados: number; alertas_criados: number };
  },
};
