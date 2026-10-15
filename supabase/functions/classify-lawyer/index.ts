// Radar Ético — classify-lawyer
// Recalcula lawyer_score / sinais_identificacao e ajusta o status de monitoramento.
import { classifyLawyer } from "../_shared/engine.ts";
import { handleOptions, json, svc } from "../_shared/supabase.ts";
import { requireRole } from "../_shared/auth.ts";

Deno.serve(async (req) => {
  const opt = handleOptions(req);
  if (opt) return opt;
  if (req.method !== "POST") return json({ error: "Método não permitido" }, 405);

  const auth = await requireRole(req, "analista");
  if (!auth.ok) return auth.response;

  const body = await req.json().catch(() => ({}) as { profile_id?: string });
  const db = svc();

  try {
    const { data: params } = await db
      .from("app_params")
      .select("lawyer_score_min")
      .eq("id", 1)
      .single();
    const scoreMin = Number(params?.lawyer_score_min ?? 60);

    let q = db.from("social_profiles").select("id, bio, categoria_perfil, links_externos");
    q = body.profile_id ? q.eq("id", body.profile_id) : q.eq("status_monitoramento", "ativo");
    const { data: perfis, error } = await q;
    if (error) throw new Error(error.message);

    const agora = new Date().toISOString();
    let atualizados = 0;

    for (const p of perfis ?? []) {
      const cls = classifyLawyer(p.bio ?? "", p.categoria_perfil ?? "", p.links_externos ?? []);
      const { error: uErr } = await db
        .from("social_profiles")
        .update({
          lawyer_score: cls.score,
          sinais_identificacao: cls.sinais,
          status_monitoramento: cls.score >= scoreMin ? "ativo" : "ignorado",
          ultima_varredura: agora,
        })
        .eq("id", p.id);
      if (uErr) throw new Error(`falha ao atualizar ${p.id}: ${uErr.message}`);
      atualizados++;
    }

    return json({ atualizados });
  } catch (err) {
    return json({ error: "Falha na classificação", detalhe: String(err) }, 500);
  }
});
