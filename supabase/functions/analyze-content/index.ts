// Radar Ético — analyze-content
// Análise de conteúdos: (a) regras determinísticas + (b) IA semântica via Lovable AI.
// Gera alerts + alert_evidence + alert_events e recalcula o risco dos perfis.
import { analyzeText, sha256hex, type RuleRow } from "../_shared/engine.ts";
import { handleOptions, json, svc } from "../_shared/supabase.ts";
import { requireRole } from "../_shared/auth.ts";

const AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const AI_MODEL = "google/gemini-2.5-flash";
const BATCH = 5;
const STATUS_ATIVOS_RISCO = ["novo", "em_analise", "confirmado", "encaminhado_ted"];

interface AiMatch {
  rule_codigo: string;
  trecho: string;
  confianca: number;
  justificativa: string;
}

function toRuleRow(r: Record<string, unknown>): RuleRow {
  return {
    id: String(r.id),
    codigo: String(r.codigo),
    nome: String(r.nome),
    descricao: (r.descricao as string) ?? null,
    exemplos_positivos: (r.exemplos_positivos as string[]) ?? [],
    tipo_deteccao: r.tipo_deteccao as RuleRow["tipo_deteccao"],
    padroes: (r.padroes as string[]) ?? [],
    exemplos_negativos: (r.exemplos_negativos as string[]) ?? [],
    gravidade: r.gravidade as RuleRow["gravidade"],
    limiar_confianca: Number(r.limiar_confianca ?? 0.7),
    redes_aplicaveis: (r.redes_aplicaveis as string[]) ?? [],
    ativo: Boolean(r.ativo),
    fundamento_normativo: (r.fundamento_normativo as string) ?? null,
    versao: Number(r.versao ?? 1),
    peso_score: Number(r.peso_score ?? 10),
  };
}

function systemPrompt(rules: RuleRow[]): string {
  const lista = rules.map((r) => ({
    codigo: r.codigo,
    nome: r.nome,
    descricao: r.descricao ?? "",
    fundamento: r.fundamento_normativo ?? "",
    exemplos_positivos: r.exemplos_positivos?.slice(0, 3) ?? [],
    exemplos_negativos: r.exemplos_negativos.slice(0, 2),
  }));
  return (
    `Você é um analista jurídico do Radar Ético (OAB). Analise conteúdos públicos de redes sociais ` +
    `e indique quais regras de publicidade irregular disparam, respondendo SOMENTE com JSON válido no formato ` +
    `{"resultados":[{"content_idx":1,"matches":[{"rule_codigo":"CAP-01","trecho":"...","confianca":0.92,"justificativa":"..."}]}]}. ` +
    `confianca é um número entre 0 e 1. Seja conservador: conteúdo meramente educativo sem captação de clientes não dispara regra. ` +
    `Regras ativas: ${JSON.stringify(lista)}`
  );
}

// Chama a IA para um lote de conteúdos. Falhas não quebram o fluxo (retorna vazio).
async function aiBatch(
  items: { idx: number; texto: string }[],
  rules: RuleRow[],
  apiKey: string,
): Promise<Map<number, AiMatch[]>> {
  const out = new Map<number, AiMatch[]>();
  const user = items.map((it) => `[${it.idx}] ${it.texto.slice(0, 2000)}`).join("\n\n");
  const res = await fetch(AI_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: AI_MODEL,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt(rules) },
        { role: "user", content: `Analise os conteúdos:\n\n${user}` },
      ],
    }),
    signal: AbortSignal.timeout(90_000),
  });
  if (!res.ok) throw new Error(`IA retornou ${res.status}`);
  const data = await res.json();
  const parsed = JSON.parse(data.choices?.[0]?.message?.content ?? "{}");
  const byCodigo = new Map(rules.map((r) => [r.codigo, r]));
  for (const r of parsed.resultados ?? []) {
    const ms: AiMatch[] = [];
    for (const m of r.matches ?? []) {
      if (!byCodigo.has(m.rule_codigo)) continue; // código desconhecido: descarta
      ms.push({
        rule_codigo: m.rule_codigo,
        trecho: String(m.trecho ?? "").slice(0, 500),
        confianca: Math.max(0, Math.min(1, Number(m.confianca ?? 0))),
        justificativa: String(m.justificativa ?? "").slice(0, 1000),
      });
    }
    out.set(Number(r.content_idx), ms);
  }
  return out;
}

Deno.serve(async (req) => {
  const opt = handleOptions(req);
  if (opt) return opt;
  if (req.method !== "POST") return json({ error: "Método não permitido" }, 405);

  const auth = await requireRole(req, "analista");
  if (!auth.ok) return auth.response;

  const body = await req
    .json()
    .catch(() => ({}) as { content_ids?: string[]; profile_id?: string });
  const db = svc();
  const inicio = new Date().toISOString();

  try {
    const [{ data: ruleRows }, { data: params }] = await Promise.all([
      db.from("rules").select("*").eq("ativo", true),
      db.from("app_params").select("limiar_global").eq("id", 1).single(),
    ]);
    const rules = (ruleRows ?? []).map(toRuleRow);
    const limiarGlobal = Number(params?.limiar_global ?? 0.7);
    const byCodigo = new Map(rules.map((r) => [r.codigo, r]));

    // ---- conteúdos-alvo
    let contents: { id: string; profile_id: string; texto: string; url: string | null }[] = [];
    if (body.content_ids?.length) {
      const { data } = await db
        .from("content_items")
        .select("id, profile_id, texto, url")
        .in("id", body.content_ids);
      contents = data ?? [];
    } else if (body.profile_id) {
      const { data } = await db
        .from("content_items")
        .select("id, profile_id, texto, url")
        .eq("profile_id", body.profile_id)
        .order("coletado_em", { ascending: false })
        .limit(50);
      contents = data ?? [];
    } else {
      const { data: alerted } = await db
        .from("alerts")
        .select("content_item_id")
        .not("content_item_id", "is", null)
        .limit(5000);
      const comAlerta = new Set((alerted ?? []).map((a) => a.content_item_id));
      const { data } = await db
        .from("content_items")
        .select("id, profile_id, texto, url")
        .order("coletado_em", { ascending: false })
        .limit(200);
      contents = (data ?? []).filter((c) => !comAlerta.has(c.id)).slice(0, 50);
    }
    if (!contents.length) return json({ analisados: 0, alertas_criados: 0, ia_usada: false });

    const pids = [...new Set(contents.map((c) => c.profile_id))];
    const { data: profs } = await db
      .from("social_profiles")
      .select("id, rede, uf_provavel")
      .in("id", pids);
    const profMap = new Map((profs ?? []).map((p) => [p.id, p]));

    // ---- (a) determinístico
    const det = new Map<
      string,
      { rule: RuleRow; trecho: string; confianca: number; justificativa: string }[]
    >();
    for (const c of contents) {
      const rede = profMap.get(c.profile_id)?.rede as string | undefined;
      det.set(c.id, analyzeText(c.texto ?? "", rules, rede));
    }

    // ---- (b) IA semântica (lotes de 5; falha não quebra)
    const apiKey = Deno.env.get("LOVABLE_API_KEY") ?? "";
    let ia_usada = false;
    const ai = new Map<string, AiMatch[]>();
    if (apiKey && rules.length) {
      for (let i = 0; i < contents.length; i += BATCH) {
        const lote = contents
          .slice(i, i + BATCH)
          .map((c, k) => ({ idx: i + k + 1, id: c.id, texto: c.texto ?? "" }));
        try {
          const res = await aiBatch(lote, rules, apiKey);
          for (const [idx, ms] of res) {
            const c = contents[idx - 1];
            if (c) ai.set(c.id, ms);
          }
          ia_usada = true;
        } catch (e) {
          console.warn("IA falhou no lote, seguindo só com determinístico:", String(e));
        }
      }
    }

    // ---- merge por regra (maior confiança), aplicando o limiar
    const alertRows: Record<string, unknown>[] = [];
    const vistos = new Set<string>(); // content_id|rule_id
    for (const c of contents) {
      const merged = new Map<
        string,
        { rule: RuleRow; trecho: string; confianca: number; justificativa: string }
      >();
      for (const m of det.get(c.id) ?? []) {
        merged.set(m.rule.id, {
          rule: m.rule,
          trecho: m.trecho,
          confianca: m.confianca,
          justificativa: m.justificativa,
        });
      }
      for (const m of ai.get(c.id) ?? []) {
        const rule = byCodigo.get(m.rule_codigo)!;
        const cur = merged.get(rule.id);
        if (!cur || m.confianca > cur.confianca) {
          merged.set(rule.id, {
            rule,
            trecho: m.trecho,
            confianca: Math.round(m.confianca * 100) / 100,
            justificativa: m.justificativa,
          });
        }
      }
      const uf = (profMap.get(c.profile_id)?.uf_provavel as string | null) ?? null;
      for (const m of merged.values()) {
        const limiar = Math.max(m.rule.limiar_confianca, limiarGlobal);
        if (m.confianca < limiar) continue;
        const key = `${c.id}|${m.rule.id}`;
        if (vistos.has(key)) continue;
        vistos.add(key);
        alertRows.push({
          profile_id: c.profile_id,
          content_item_id: c.id,
          rule_id: m.rule.id,
          rule_versao: m.rule.versao ?? 1,
          trecho_detectado: m.trecho,
          justificativa_ia: m.justificativa,
          confianca: m.confianca,
          gravidade: m.rule.gravidade,
          status: "novo",
          seccional_uf: uf,
        });
      }
    }

    // ---- insere (ignora duplicados de mesmo conteúdo + mesma regra)
    if (alertRows.length) {
      const { error } = await db
        .from("alerts")
        .upsert(alertRows, { onConflict: "content_item_id,rule_id", ignoreDuplicates: true })
        .select("id");
      if (error) throw new Error(`falha ao inserir alertas: ${error.message}`);
    }
    const agora = new Date().toISOString();

    // Re-lê os alertas criados nesta rodada para anexar evidência/eventos
    const { data: criados } = alertRows.length
      ? await db
          .from("alerts")
          .select("id, content_item_id")
          .in("content_item_id", [...new Set(alertRows.map((r) => r.content_item_id as string))])
          .gte("criado_em", inicio)
      : { data: [] as { id: string; content_item_id: string }[] };

    for (const a of criados ?? []) {
      const c = contents.find((x) => x.id === a.content_item_id)!;
      await db.from("alert_evidence").insert({
        alert_id: a.id,
        screenshot_url: null,
        url_original: c.url,
        texto_capturado: c.texto,
        hash_sha256: await sha256hex(`${c.url ?? ""}${c.texto ?? ""}`),
        capturado_em: agora,
      });
      await db.from("alert_events").insert({
        alert_id: a.id,
        tipo: "status",
        texto: "Alerta criado automaticamente",
        autor: "Robô",
      });
    }

    // ---- recalcula risco_score dos perfis afetados
    const afetados = [...new Set(alertRows.map((r) => r.profile_id as string))];
    for (const pid of afetados) {
      const { data: als } = await db
        .from("alerts")
        .select("status, rule_id, rules(peso_score)")
        .eq("profile_id", pid)
        .in("status", STATUS_ATIVOS_RISCO);
      const soma = (als ?? []).reduce((acc, a) => {
        const peso = Number(
          (a.rules as unknown as { peso_score: number } | null)?.peso_score ?? 10,
        );
        const mult = a.status === "confirmado" || a.status === "encaminhado_ted" ? 1 : 0.5;
        return acc + peso * mult;
      }, 0);
      await db
        .from("social_profiles")
        .update({ risco_score: Math.min(100, Math.round(soma)) })
        .eq("id", pid);
    }

    await db.from("scan_jobs").insert({
      tipo: "analise",
      status: "concluido",
      inicio,
      fim: new Date().toISOString(),
      itens_processados: contents.length,
      erros: [],
      custo_estimado: 0,
    });

    return json({ analisados: contents.length, alertas_criados: (criados ?? []).length, ia_usada });
  } catch (err) {
    await svc()
      .from("scan_jobs")
      .insert({
        tipo: "analise",
        status: "falhou",
        inicio,
        fim: new Date().toISOString(),
        itens_processados: 0,
        erros: [String(err)],
        custo_estimado: 0,
      });
    return json({ error: "Falha na análise", detalhe: String(err) }, 500);
  }
});
