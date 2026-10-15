// Radar Ético — run-scan
// Orquestra o pipeline completo: descoberta → classificação → análise → enriquecimento.
// Repassa o Authorization original para cada function (o controle de papel é refeito em cada uma).
import { handleOptions, json } from "../_shared/supabase.ts";
import { requireRole } from "../_shared/auth.ts";

const STEPS = ["discover-profiles", "classify-lawyer", "analyze-content", "enrich-lawyer"] as const;

Deno.serve(async (req) => {
  const opt = handleOptions(req);
  if (opt) return opt;
  if (req.method !== "POST") return json({ error: "Método não permitido" }, 405);

  const auth = await requireRole(req, "analista");
  if (!auth.ok) return auth.response;

  const body = await req.json().catch(() => ({}) as { profile_id?: string });
  const base = `${Deno.env.get("SUPABASE_URL")}/functions/v1`;
  // Repassa a credencial usada (JWT do usuário ou segredo do cron) às sub-functions.
  const fwd: Record<string, string> = { "Content-Type": "application/json" };
  const authHeader = req.headers.get("Authorization");
  const cronSecret = req.headers.get("x-cron-secret");
  if (authHeader) fwd["Authorization"] = authHeader;
  if (cronSecret) fwd["x-cron-secret"] = cronSecret;

  const resumo: Record<string, unknown> = {};
  for (const step of STEPS) {
    // Com profile_id, a descoberta global é pulada (varredura focada num perfil).
    if (step === "discover-profiles" && body.profile_id) {
      resumo[step] = { pulada: true };
      continue;
    }
    try {
      const res = await fetch(`${base}/${step}`, {
        method: "POST",
        headers: fwd,
        body: JSON.stringify(body.profile_id ? { profile_id: body.profile_id } : {}),
      });
      const data = await res.json().catch(() => ({}));
      resumo[step] = res.ok
        ? data
        : { erro: (data as { error?: string }).error ?? `HTTP ${res.status}` };
    } catch (err) {
      resumo[step] = { erro: String(err) };
    }
  }

  return json({ ok: true, etapas: resumo });
});
