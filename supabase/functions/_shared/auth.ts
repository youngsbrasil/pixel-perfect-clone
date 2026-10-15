// Autorização das edge functions: valida o JWT do chamador e o papel em `user_roles`.
import { createClient, type User } from "https://esm.sh/@supabase/supabase-js@2";
import { json } from "./supabase.ts";

export type MinRole = "leitor" | "analista" | "admin_seccional" | "admin_nacional";

// Hierarquia de papéis (maior = mais poder).
const HIERARCHY: Record<string, number> = {
  leitor: 0,
  analista: 1,
  admin_seccional: 2,
  admin_nacional: 3,
};

export type AuthResult =
  { ok: true; user: User; role: string; uf: string | null } | { ok: false; response: Response };

/** Exige papel mínimo. Lê o papel em `user_roles` (RLS permite ler a própria linha). */
export async function requireRole(req: Request, minRole: MinRole): Promise<AuthResult> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return { ok: false, response: json({ error: "Não autenticado" }, 401) };

  const client = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });

  const {
    data: { user },
    error,
  } = await client.auth.getUser();
  if (error || !user) return { ok: false, response: json({ error: "Sessão inválida" }, 401) };

  const { data: roleRow } = await client
    .from("user_roles")
    .select("role, seccional_uf")
    .eq("user_id", user.id)
    .maybeSingle();

  const role = roleRow?.role as string | undefined;
  if (!role || !(role in HIERARCHY)) {
    return { ok: false, response: json({ error: "Usuário sem papel atribuído" }, 403) };
  }
  if (HIERARCHY[role]! < HIERARCHY[minRole]!) {
    return { ok: false, response: json({ error: "Sem permissão para esta operação" }, 403) };
  }
  return { ok: true, user, role, uf: (roleRow?.seccional_uf as string | null) ?? null };
}
