import { useEffect, useState, type ReactNode } from "react";
import { Moon, Sun } from "lucide-react";
import { Navigate, useRouterState } from "@tanstack/react-router";
import { LogOut, ShieldCheck } from "lucide-react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { AppSidebar } from "./app-sidebar";
import { actions, boot, onAuthChange, useApp } from "@/lib/store";
import { ROLE_LABEL } from "@/lib/types";

function Splash() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center">
        <ShieldCheck className="mx-auto h-10 w-10 text-primary" />
        <p className="mt-2 font-serif text-xl">Radar Ético</p>
        <p className="text-sm text-muted-foreground">Carregando…</p>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const s = useApp();
  const [dark, setDark] = useState(true);
  const path = useRouterState({ select: (r) => r.location.pathname });

  useEffect(() => { document.documentElement.classList.toggle("light", !dark); }, [dark]);
  useEffect(() => {
    boot();
    return onAuthChange(() => boot(true));
  }, []);

  if (s.mode === "loading") return <Splash />;
  if (path === "/login") return <>{children}</>;
  if (s.mode === "remote" && !s.authed) return <Navigate to="/login" />;

  const user = s.users.find((u) => u.id === s.currentUserId);
  const remote = s.mode === "remote";

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-10 flex h-12 items-center gap-3 border-b bg-card px-3">
            <SidebarTrigger />
            {remote ? (
              <span className="rounded-sm bg-sev-baixa/15 px-2 py-0.5 text-xs font-medium text-sev-baixa">Conectado ao banco · dados reais</span>
            ) : (
              <span className="rounded-sm bg-sev-media/15 px-2 py-0.5 text-xs font-medium text-sev-media">Ambiente de demonstração · dados fictícios · coleta simulada</span>
            )}
            <div className="ml-auto flex items-center gap-2">
              {remote && user ? (
                <>
                  <span className="hidden text-xs text-muted-foreground md:inline">
                    {user.nome} · {ROLE_LABEL[user.role]}{user.seccional_uf ? ` · ${user.seccional_uf}` : ""}
                  </span>
                  <Button size="icon" variant="ghost" aria-label="Sair"
                    onClick={() => actions.signOut().catch(() => {})}>
                    <LogOut className="h-4 w-4" />
                  </Button>
                </>
              ) : (
                <>
                  <span className="hidden text-xs text-muted-foreground md:inline">Simular acesso como</span>
                  <Select value={s.currentUserId} onValueChange={actions.switchUser}>
                    <SelectTrigger className="h-8 w-60 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>{s.users.map((u) => <SelectItem key={u.id} value={u.id}>{ROLE_LABEL[u.role]}{u.seccional_uf ? ` · ${u.seccional_uf}` : ""} — {u.nome}</SelectItem>)}</SelectContent>
                  </Select>
                </>
              )}
              <Button size="icon" variant="ghost" onClick={() => setDark(!dark)} aria-label="Alternar modo escuro">{dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}</Button>
            </div>
          </header>
          <main className="flex-1 p-6">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
