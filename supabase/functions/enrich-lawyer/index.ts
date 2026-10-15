// Radar Ético — enrich-lawyer
// Enriquece lawyer_data: telefones, WhatsApp, e-mails, site e OAB a partir da bio/links.
import { enrich, validateOAB } from "../_shared/engine.ts";
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
    let q = db.from("social_profiles").select("id, nome_exibido, bio, links_externos");
    q = body.profile_id ? q.eq("id", body.profile_id) : q.eq("status_monitoramento", "ativo");
    const { data: perfis, error } = await q;
    if (error) throw new Error(error.message);

    const agora = new Date().toISOString();
    let atualizados = 0;

    for (const p of perfis ?? []) {
      const e = enrich(p.bio ?? "", p.links_externos ?? []);

      // Preserva validação existente se a OAB não mudou (evita clobber de triagem manual).
      const { data: atual } = await db
        .from("lawyer_data")
        .select("oab_numero, oab_uf, oab_validacao")
        .eq("profile_id", p.id)
        .maybeSingle();
      let validacao = (atual?.oab_validacao as string) ?? "pendente";
      if (
        !atual ||
        atual.oab_numero !== (e.oab?.numero ?? null) ||
        atual.oab_uf !== (e.oab?.uf ?? null)
      ) {
        // TODO: integrar o Cadastro Nacional dos Advogados (CNA) aqui.
        validacao = await validateOAB(e.oab?.numero ?? "", e.oab?.uf ?? "");
      }

      const { error: uErr } = await db.from("lawyer_data").upsert(
        {
          profile_id: p.id,
          nome_completo: p.nome_exibido,
          oab_numero: e.oab?.numero ?? null,
          oab_uf: e.oab?.uf ?? null,
          oab_validacao: validacao,
          telefones: e.telefones,
          whatsapp: e.whatsapp,
          emails: e.emails,
          site: e.site,
          coletado_em: agora,
        },
        { onConflict: "profile_id" },
      );
      if (uErr) throw new Error(`falha ao enriquecer ${p.id}: ${uErr.message}`);
      atualizados++;
    }

    return json({ atualizados });
  } catch (err) {
    return json({ error: "Falha no enriquecimento", detalhe: String(err) }, 500);
  }
});
