// Radar Ético — discover-profiles
// Descoberta de perfis candidatos.
//
// Ações (body.acao):
// - "importar": cadastra perfis reais informados pelo analista
//   (body.perfis: [{ url, bio?, nome_exibido? }]). É o adapter de
//   "busca por palavra-chave assistida": o analista busca os termos no
//   Google/Bing (links gerados no front) e cola aqui as URLs encontradas.
// - (omitida): processa as fontes tipo "perfil" (@usuário) cadastradas em
//   discovery_sources — inclusão explícita do analista, sem gate de score.
//
// Não há mais geração de perfis fictícios: todo perfil no banco veio de
// indicação humana ou importação assistida.
import { classifyLawyer, enrich, extractOAB } from "../_shared/engine.ts";
import { handleOptions, json, svc } from "../_shared/supabase.ts";
import { requireRole } from "../_shared/auth.ts";

const REDES_VALIDAS = ["instagram", "tiktok", "facebook", "linkedin", "youtube", "x"];

interface Candidato {
  rede: string;
  username: string;
  url: string;
  nome_exibido: string;
  bio: string;
  categoria_perfil: string;
  links_externos: string[];
}

/** URL canônica do perfil por rede. */
function canonicalUrl(rede: string, username: string): string {
  switch (rede) {
    case "tiktok":
    case "youtube":
      return `https://${rede}.com/@${username}`;
    case "linkedin":
      return `https://linkedin.com/in/${username}`;
    case "x":
      return `https://x.com/${username}`;
    default:
      return `https://${rede}.com/${username}`;
  }
}

/** Extrai {rede, username} de URLs de perfil das redes suportadas. */
export function parseProfileUrl(raw: string): { rede: string; username: string } | null {
  const m = String(raw || "").trim().match(
    /^https?:\/\/(?:www\.|m\.|pt\.)?([a-z0-9.-]+)\/(@?[A-Za-z0-9._-]{1,60})/i,
  );
  if (!m) return null;
  const host = m[1].toLowerCase();
  let username = m[2].replace(/^@/, "");
  // LinkedIn usa /in/usuario
  if (host.includes("linkedin.com") && username.toLowerCase() === "in") {
    const m2 = String(raw || "").trim().match(/^https?:\/\/(?:www\.)?linkedin\.com\/in\/(@?[A-Za-z0-9._-]{1,60})/i);
    if (m2) username = m2[1].replace(/^@/, "");
  }
  let rede: string | null = null;
  if (host.includes("instagram.com")) rede = "instagram";
  else if (host.includes("tiktok.com")) rede = "tiktok";
  else if (host.includes("facebook.com") || host === "fb.com" || host.endsWith(".fb.com")) rede = "facebook";
  else if (host.includes("linkedin.com")) rede = "linkedin";
  else if (host.includes("youtube.com") || host === "youtu.be") rede = "youtube";
  else if (host === "x.com" || host.endsWith(".x.com") || host.includes("twitter.com")) rede = "x";
  if (!rede || !username || !/^[A-Za-z0-9._-]{1,60}$/.test(username)) return null;
  return { rede, username };
}

async function ensureProfile(
  db: ReturnType<typeof svc>,
  c: Candidato,
  scoreMin: number,
  agora: string,
  bypassScore: boolean,
): Promise<"novo" | "duplicado" | "baixo_score"> {
  const { data: dup } = await db
    .from("social_profiles")
    .select("id")
    .eq("rede", c.rede)
    .eq("username", c.username)
    .maybeSingle();
  if (dup) return "duplicado";

  const cls = classifyLawyer(c.bio, c.categoria_perfil, c.links_externos);
  if (!bypassScore && cls.score < scoreMin) return "baixo_score";

  const e = enrich(c.bio, c.links_externos);
  const oabUf = e.oab?.uf ?? extractOAB(c.bio)?.uf ?? null;

  const { data: perfil, error: pErr } = await db
    .from("social_profiles")
    .insert({
      rede: c.rede,
      username: c.username,
      url: c.url,
      nome_exibido: c.nome_exibido,
      bio: c.bio,
      seguidores: 0,
      categoria_perfil: c.categoria_perfil,
      links_externos: c.links_externos,
      lawyer_score: cls.score,
      sinais_identificacao: cls.sinais,
      uf_provavel: oabUf,
      status_monitoramento: "ativo",
      ultima_varredura: agora,
      risco_score: 0,
    })
    .select("id")
    .single();
  if (pErr || !perfil) throw new Error(`falha ao inserir perfil ${c.username}: ${pErr?.message}`);

  await db.from("lawyer_data").insert({
    profile_id: perfil.id,
    nome_completo: c.nome_exibido,
    oab_numero: e.oab?.numero ?? null,
    oab_uf: e.oab?.uf ?? null,
    oab_validacao: "pendente",
    telefones: e.telefones,
    whatsapp: e.whatsapp,
    emails: e.emails,
    site: e.site,
    coletado_em: agora,
  });
  return "novo";
}

Deno.serve(async (req) => {
  const opt = handleOptions(req);
  if (opt) return opt;
  if (req.method !== "POST") return json({ error: "Método não permitido" }, 405);

  const auth = await requireRole(req, "analista");
  if (!auth.ok) return auth.response;

  const db = svc();
  const inicio = new Date().toISOString();
  const body = (await req.json().catch(() => ({}))) as {
    acao?: string;
    perfis?: { url: string; bio?: string; nome_exibido?: string }[];
  };

  const registrarJob = async (tipo: string, status: string, itens: number, erros: string[]) => {
    await db.from("scan_jobs").insert({
      tipo,
      status,
      inicio,
      fim: new Date().toISOString(),
      itens_processados: itens,
      erros,
      custo_estimado: 0,
    });
  };

  try {
    const { data: params } = await db.from("app_params").select("lawyer_score_min").eq("id", 1).single();
    const scoreMin = Number((params as { lawyer_score_min?: number } | null)?.lawyer_score_min ?? 60);
    const agora = new Date().toISOString();

    // ---- Ação "importar": URLs reais coladas pelo analista ----
    if (body.acao === "importar") {
      const lista = Array.isArray(body.perfis) ? body.perfis.slice(0, 100) : [];
      let novos = 0;
      const ignorados: { url: string; motivo: string }[] = [];

      for (const p of lista) {
        const parsed = parseProfileUrl(p.url);
        if (!parsed) {
          ignorados.push({ url: String(p.url || "").slice(0, 120), motivo: "URL não reconhecida" });
          continue;
        }
        const bio = String(p.bio || "").slice(0, 2000);
        const r = await ensureProfile(
          db,
          {
            rede: parsed.rede,
            username: parsed.username,
            url: canonicalUrl(parsed.rede, parsed.username),
            nome_exibido: String(p.nome_exibido || `@${parsed.username}`).slice(0, 200),
            bio,
            categoria_perfil: "A verificar",
            links_externos: [],
          },
          scoreMin,
          agora,
          false,
        );
        if (r === "novo") novos++;
        else ignorados.push({ url: p.url, motivo: r === "duplicado" ? "perfil já cadastrado" : "bio sem sinais de advocacia" });
      }

      await registrarJob("descoberta", "concluido", novos, []);
      return json({ novos, ignorados });
    }

    // ---- Padrão: processa fontes tipo "perfil" (indicação explícita) ----
    const { data: fontes } = await db
      .from("discovery_sources")
      .select("valor, rede")
      .eq("ativo", true)
      .eq("tipo", "perfil");

    let novos = 0;
    const erros: string[] = [];
    for (const f of fontes ?? []) {
      const username = String((f as { valor: string }).valor || "").trim().replace(/^@/, "");
      const rede = String((f as { rede: string }).rede || "instagram");
      if (!username || !REDES_VALIDAS.includes(rede)) {
        erros.push(`fonte ignorada: ${String((f as { valor: string }).valor)}`);
        continue;
      }
      try {
        const r = await ensureProfile(
          db,
          {
            rede,
            username,
            url: canonicalUrl(rede, username),
            nome_exibido: `@${username}`,
            bio: "",
            categoria_perfil: "A verificar",
            links_externos: [],
          },
          scoreMin,
          agora,
          true, // inclusão explícita do analista: sem gate de score
        );
        if (r === "novo") novos++;
      } catch (err) {
        erros.push(`@${username}: ${String(err)}`);
      }
    }

    await registrarJob("descoberta", "concluido", novos, erros);
    return json({ novos, fontes_perfil: (fontes ?? []).length, erros });
  } catch (err) {
    await registrarJob("descoberta", "falhou", 0, [String(err)]);
    return json({ error: "Falha na descoberta", detalhe: String(err) }, 500);
  }
});
