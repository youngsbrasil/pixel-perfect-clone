// Radar Ético — collect-content
// Coleta assistida de conteúdo: o analista cola posts reais de um perfil
// (URL + texto) e a function registra em content_items com dedup por hash.
// É o adapter de "coleta" na ausência de APIs oficiais das redes — o humano
// coleta, o sistema classifica/analisa.
import { handleOptions, json, svc } from "../_shared/supabase.ts";
import { requireRole } from "../_shared/auth.ts";

const TIPOS = ["post", "reels", "story", "bio", "comentario", "link"];

async function sha256Hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function hashtags(texto: string): string[] {
  const tags = texto.match(/#[\p{L}\p{N}_]+/gu) ?? [];
  return [...new Set(tags.map((t) => t.toLowerCase()))].slice(0, 20);
}

Deno.serve(async (req) => {
  const opt = handleOptions(req);
  if (opt) return opt;
  if (req.method !== "POST") return json({ error: "Método não permitido" }, 405);

  const auth = await requireRole(req, "analista");
  if (!auth.ok) return auth.response;

  const db = svc();
  const body = (await req.json().catch(() => ({}))) as {
    profile_id?: string;
    itens?: { url?: string; texto: string; tipo?: string; publicado_em?: string }[];
  };

  if (!body.profile_id) return json({ error: "profile_id é obrigatório" }, 400);
  const lista = Array.isArray(body.itens) ? body.itens.slice(0, 50) : [];
  if (!lista.length) return json({ error: "Nenhum conteúdo informado" }, 400);

  // Confere que o perfil existe (RLS do service_role bypassa; o requireRole já filtra papel).
  const { data: perfil } = await db
    .from("social_profiles")
    .select("id")
    .eq("id", body.profile_id)
    .maybeSingle();
  if (!perfil) return json({ error: "Perfil não encontrado" }, 404);

  const agora = new Date().toISOString();
  let novos = 0;
  const ignorados: { motivo: string }[] = [];

  for (const item of lista) {
    const texto = String(item.texto || "").trim().slice(0, 5000);
    if (texto.length < 3) {
      ignorados.push({ motivo: "texto muito curto" });
      continue;
    }
    const tipo = TIPOS.includes(String(item.tipo)) ? String(item.tipo) : "post";
    const hash = await sha256Hex(`${body.profile_id}:${texto}`);

    const { data: dup } = await db
      .from("content_items")
      .select("id")
      .eq("profile_id", body.profile_id)
      .eq("hash_conteudo", hash)
      .maybeSingle();
    if (dup) {
      ignorados.push({ motivo: "conteúdo duplicado" });
      continue;
    }

    const { error } = await db.from("content_items").insert({
      profile_id: body.profile_id,
      tipo,
      url: String(item.url || "").slice(0, 500) || null,
      texto,
      hashtags: hashtags(texto),
      publicado_em: item.publicado_em || agora,
      coletado_em: agora,
      hash_conteudo: hash,
    });
    if (error) {
      ignorados.push({ motivo: `falha ao salvar: ${error.message}` });
      continue;
    }
    novos++;
  }

  await db.from("scan_jobs").insert({
    tipo: "coleta",
    status: "concluido",
    inicio: agora,
    fim: new Date().toISOString(),
    itens_processados: novos,
    erros: [],
    custo_estimado: 0,
  });

  return json({ novos, ignorados: ignorados.length });
});
