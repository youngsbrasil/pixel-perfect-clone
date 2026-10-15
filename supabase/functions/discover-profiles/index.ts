// Radar Ético — discover-profiles
// Descoberta de perfis candidatos via provedor (MOCK na fase 1; implementações
// reais — Apify/APIs oficiais — plugam no mesmo contrato sem mexer no resto).
import { classifyLawyer, enrich, extractOAB } from "../_shared/engine.ts";
import { handleOptions, json, svc } from "../_shared/supabase.ts";
import { requireRole } from "../_shared/auth.ts";

// Mesmo contrato do mockProvider.discoverProfiles do front.
async function mockDiscover(n: number, startCounter: number) {
  return Array.from({ length: n }, (_, i) => {
    const counter = startCounter + i + 1;
    const u = `adv.ficticio.novo${counter}`;
    return {
      rede: "instagram",
      username: u,
      url: `https://instagram.com/${u}`,
      nome_exibido: `Dr(a). Perfil Fictício ${counter}`,
      bio: `Advogado(a) | OAB/SP ${100000 + counter * 37} | Direito Previdenciário`,
      seguidores: 1000 + counter * 311,
      categoria_perfil: "Advogado(a)",
      links_externos: [`https://wa.me/551190000${1000 + counter}`],
    };
  });
}

Deno.serve(async (req) => {
  const opt = handleOptions(req);
  if (opt) return opt;
  if (req.method !== "POST") return json({ error: "Método não permitido" }, 405);

  const auth = await requireRole(req, "analista");
  if (!auth.ok) return auth.response;

  const db = svc();
  const inicio = new Date().toISOString();

  try {
    const [{ data: sources }, { data: params }] = await Promise.all([
      db.from("discovery_sources").select("id").eq("ativo", true),
      db.from("app_params").select("lawyer_score_min").eq("id", 1).single(),
    ]);
    const ativas = sources?.length ?? 0;
    const scoreMin = Number(params?.lawyer_score_min ?? 60);

    // Contador continua de onde parou (usernames únicos por (rede, username)).
    const { data: existentes } = await db
      .from("social_profiles")
      .select("username")
      .like("username", "adv.ficticio.novo%");
    const usados = (existentes ?? []).map(
      (r) => Number(r.username.replace("adv.ficticio.novo", "")) || 0,
    );
    const startCounter = usados.length ? Math.max(...usados) : 0;

    const n = Math.max(1, Math.min(3, ativas));
    const candidatos = await mockDiscover(n, startCounter);

    let novos = 0,
      ignorados_baixo_score = 0;
    const agora = new Date().toISOString();

    for (const c of candidatos) {
      const { data: dup } = await db
        .from("social_profiles")
        .select("id")
        .eq("rede", c.rede)
        .eq("username", c.username)
        .maybeSingle();
      if (dup) continue; // já existe: pula em silêncio

      const cls = classifyLawyer(c.bio, c.categoria_perfil, c.links_externos);
      if (cls.score < scoreMin) {
        ignorados_baixo_score++;
        continue;
      }

      const e = enrich(c.bio, c.links_externos);
      const oabUf = e.oab?.uf ?? extractOAB(c.bio)?.uf ?? "SP";

      const { data: perfil, error: pErr } = await db
        .from("social_profiles")
        .insert({
          rede: c.rede,
          username: c.username,
          url: c.url,
          nome_exibido: c.nome_exibido,
          bio: c.bio,
          seguidores: c.seguidores,
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
      if (pErr || !perfil)
        throw new Error(`falha ao inserir perfil ${c.username}: ${pErr?.message}`);

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
      novos++;
    }

    await db.from("scan_jobs").insert({
      tipo: "descoberta",
      status: "concluido",
      inicio,
      fim: new Date().toISOString(),
      itens_processados: novos,
      erros: [],
      custo_estimado: 0,
    });

    return json({ novos, ignorados_baixo_score });
  } catch (err) {
    await svc()
      .from("scan_jobs")
      .insert({
        tipo: "descoberta",
        status: "falhou",
        inicio,
        fim: new Date().toISOString(),
        itens_processados: 0,
        erros: [String(err)],
        custo_estimado: 0,
      });
    return json({ error: "Falha na descoberta", detalhe: String(err) }, 500);
  }
});
