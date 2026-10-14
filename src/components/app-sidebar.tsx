import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, Bell, Users, Scale, Search, Radio, History, FileText, Settings, ShieldCheck } from "lucide-react";
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";

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
  const active = (u: string) => (u === "/" ? path === "/" : path.startsWith(u));
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2 px-1 py-1.5">
          <ShieldCheck className="h-6 w-6 shrink-0 text-sidebar-primary" />
          <div className="leading-tight group-data-[collapsible=icon]:hidden">
            <div className="font-serif text-base font-semibold text-sidebar-primary">Radar Ético</div>
            <div className="text-[11px] text-sidebar-foreground/70">Publicidade na advocacia</div>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        {groups.map((g) => (
          <SidebarGroup key={g.label}>
            <SidebarGroupLabel className="text-sidebar-foreground/60">{g.label}</SidebarGroupLabel>
            <SidebarGroupContent><SidebarMenu>
              {g.items.map((it) => (
                <SidebarMenuItem key={it.u}>
                  <SidebarMenuButton asChild isActive={active(it.u)} tooltip={it.t}>
                    <Link to={it.u}><it.i className="h-4 w-4" /><span>{it.t}</span></Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu></SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
    </Sidebar>
  );
}
