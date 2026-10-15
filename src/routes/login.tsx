import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Chip } from "@/components/radar";
import { actions, useApp } from "@/lib/store";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Entrar — Radar Ético" }] }),
  component: Login,
});

function Login() {
  const s = useApp();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  // Se já está autenticado (ou o backend nem existe), não há login a fazer.
  if (s.mode !== "loading" && !(s.mode === "remote" && !s.authed)) {
    nav({ to: "/" });
    return null;
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setErr("");
    try {
      await actions.signIn(email.trim(), password);
      nav({ to: "/" });
    } catch {
      setErr("E-mail ou senha inválidos.");
    } finally { setBusy(false); }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="glass w-full max-w-sm p-6">
        <div className="mb-5 text-center">
          <div className="flex justify-center"><Chip color="blue"><ShieldCheck className="h-6 w-6" /></Chip></div>
          <h1 className="mt-3 font-sans text-2xl font-semibold tracking-tight">Radar Ético</h1>
          <p className="mt-1 text-sm text-muted-foreground">Monitoramento de publicidade na advocacia</p>
        </div>
        <form onSubmit={submit} className="grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" type="email" autoComplete="username" value={email}
              onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="pass">Senha</Label>
            <Input id="pass" type="password" autoComplete="current-password" value={password}
              onChange={(e) => setPassword(e.target.value)} required />
          </div>
          {err && <p className="text-sm text-destructive">{err}</p>}
          <Button type="submit" disabled={busy}>{busy ? "Entrando…" : "Entrar"}</Button>
        </form>
      </div>
    </div>
  );
}
