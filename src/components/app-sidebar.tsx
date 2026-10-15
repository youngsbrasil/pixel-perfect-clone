import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, Bell, Users, Scale, Search, Radio, History, FileText, Settings, ShieldCheck, Activity } from "lucide-react";
import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { useApp } from "@/lib/store";
import { cn } from "@/lib/utils";

const groups = [
  { label: "Monitoramento", items: [
    { t: "Painel", u: "/", i: LayoutDashboard }, { t: "Fila de alertas", u: "/alertas", i: Bell },
    { t: "Perfis monitorados", u: "/perfis", i: Users }, { t: "Análise manual", u: "/analise", i: Search }] },
  { label: "Configuração", items: [
    { t: "Regras", u: "/regras", i: Scale }, { t: "Fontes de descoberta", u: "/fontes", i: Radio },
    { t: "Varreduras", u: "/varreduras", i: History }, { t: "Relatórios", u: "/relatorios", i: FileText },
    { t: "Administração", u: "/admin", i: Settings }] },
] as const;

export function AppSidebar() {
  const path = useRouterState({ select: (r) => r.location.pathname });
  const s = useApp();
  const active = (u: string) => (u === "/" ? path === "/" : path.startsWith(u));
  const novos = s.alerts.filter((a) => a.status === "novo").length;

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border bg-sidebar">
      <SidebarHeader className="border-b border-sidebar-border px-4 py-4">
        <div className="flex items-center gap-2.5">
          <span className="kpi-chip chip-blue"><ShieldCheck className="h-5 w-5" /></span>
          <div className="leading-tight group-data-[collapsible=icon]:hidden">
            <div className="text-[15px] font-semibold tracking-tight text-sidebar-foreground">Radar Ético</div>
            <div className="text-[11px] text-sidebar-foreground/50">Publicidade na advocacia</div>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent className="px-2.5">
        {groups.map((g) => (
          <SidebarGroup key={g.label} className="px-0">
            <SidebarGroupLabel className="px-2 text-[10px] uppercase tracking-[0.12em] text-sidebar-foreground/40 group-data-[collapsible=icon]:hidden">{g.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="gap-1">
                {g.items.map((it) => {
                  const isA = active(it.u);
                  return (
                    <SidebarMenuItem key={it.u}>
                      <SidebarMenuButton asChild isActive={isA} tooltip={it.t}
                        className={cn(
                          "h-10 rounded-xl px-3 text-[13px] font-medium transition-all",
                          isA
                            ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-[0_0_20px_rgb(79_140_255/0.25),inset_0_0_0_1px_rgb(79_140_255/0.3)]"
                            : "text-sidebar-foreground/65 hover:bg-white/[0.04] hover:text-sidebar-foreground",
                        )}>
                        <Link to={it.u}>
                          <it.i className={cn("h-[18px] w-[18px]", isA ? "text-primary" : "opacity-70")} />
                          <span>{it.t}</span>
                          {it.u === "/alertas" && novos > 0 && (
                            <span className="num ml-auto rounded-full bg-sev-alta/15 px-1.5 py-0.5 text-[10px] font-bold text-sev-alta ring-1 ring-inset ring-sev-alta/30">{novos}</span>
                          )}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter className="p-3 group-data-[collapsible=icon]:hidden">
        <div className="glass flex items-center gap-2.5 rounded-xl p-3">
          <span className={cn("relative flex h-2.5 w-2.5")}>
            <span className={cn("absolute inline-flex h-full w-full animate-ping rounded-full opacity-60", s.mode === "remote" ? "bg-ok" : "bg-sev-media")} />
            <span className={cn("relative inline-flex h-2.5 w-2.5 rounded-full", s.mode === "remote" ? "bg-ok" : "bg-sev-media")} />
          </span>
          <div className="leading-tight">
            <div className="flex items-center gap-1 text-xs font-semibold"><Activity className="h-3 w-3" />{s.mode === "remote" ? "Banco conectado" : "Demonstração local"}</div>
            <div className="text-[10px] text-muted-foreground">{s.mode === "remote" ? "dados reais · RLS ativo" : "dados fictícios · seed"}</div>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
