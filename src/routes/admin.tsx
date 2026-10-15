import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader, Tag, fmtDate } from "@/components/radar";
import { actions } from "@/lib/store";
import { useScoped } from "@/lib/scope";
import { ROLE_LABEL, type Role } from "@/lib/types";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [
    { title: "Administração — Radar Ético" }, { name: "description", content: "Usuários, papéis, seccionais, parâmetros e auditoria." },
    { property: "og:title", content: "Administração — Radar Ético" }, { property: "og:description", content: "Administração do sistema." },
  ] }),
  component: Admin,
});

function Admin() {
  const { s, user, canAdmin, uf } = useScoped();
  const [p, setP] = useState(s.params);
  if (!canAdmin) return <p className="text-muted-foreground">Acesso restrito a administradores.</p>;
  const nat = user.role === "admin_nacional";
  const users = uf ? s.users.filter((u) => u.seccional_uf === uf) : s.users;
  return (
    <>
      <PageHeader title="Administração" desc={nat ? "Conselho Federal" : `Seccional ${uf}`} />
      <Tabs defaultValue="u"><TabsList><TabsTrigger value="u">Usuários e papéis</TabsTrigger><TabsTrigger value="s">Seccionais</TabsTrigger>{nat && <TabsTrigger value="p">Parâmetros</TabsTrigger>}<TabsTrigger value="a">Auditoria</TabsTrigger></TabsList>
        <TabsContent value="u"><div className="glass overflow-x-auto"><table className="rtable">
          <thead><tr><th>Nome</th><th>E-mail</th><th>Papel</th><th>Seccional</th></tr></thead>
          <tbody>{users.map((u) => <tr key={u.id}><td className="font-medium">{u.nome}</td><td className="text-muted-foreground">{u.email}</td>
            <td><Select value={u.role} onValueChange={(r) => actions.setUserRole(u.id, r as Role, r === "admin_nacional" ? null : u.seccional_uf ?? "SP")}><SelectTrigger className="h-8 w-44"><SelectValue /></SelectTrigger>
              <SelectContent>{(Object.keys(ROLE_LABEL) as Role[]).filter((r) => nat || r !== "admin_nacional").map((r) => <SelectItem key={r} value={r}>{ROLE_LABEL[r]}</SelectItem>)}</SelectContent></Select></td>
            <td>{nat ? <Select value={u.seccional_uf ?? "—"} onValueChange={(v) => actions.setUserRole(u.id, u.role, v === "—" ? null : v)}><SelectTrigger className="h-8 w-24"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="—">—</SelectItem>{s.seccionais.map((x) => <SelectItem key={x.uf} value={x.uf}>{x.uf}</SelectItem>)}</SelectContent></Select> : u.seccional_uf}</td></tr>)}</tbody></table></div></TabsContent>
        <TabsContent value="s"><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">{s.seccionais.map((x) => <div key={x.uf} className="glass p-4">
          <div className="flex items-center justify-between"><div className="num font-sans text-2xl font-semibold tracking-tight">{x.uf}</div><Tag>{s.profiles.filter((p) => p.uf_provavel === x.uf).length} perfis</Tag></div>
          <div className="mt-1 text-sm text-muted-foreground">{x.nome}</div>
          <div className="num mt-2 text-xs text-muted-foreground">{s.alerts.filter((a) => a.seccional_uf === x.uf).length} alertas</div>
        </div>)}</div></TabsContent>
        <TabsContent value="p"><div className="glass max-w-lg p-4">
          <h3 className="font-sans text-[15px] font-semibold tracking-tight">Parâmetros globais</h3>
          <div className="mt-3 grid gap-3">
            <div><Label>Limiar global de confiança</Label><Input type="number" step="0.05" value={p.limiar_global} onChange={(e) => setP({ ...p, limiar_global: Number(e.target.value) })} /></div>
            <div><Label>Score mínimo para monitorar perfil</Label><Input type="number" value={p.lawyer_score_min} onChange={(e) => setP({ ...p, lawyer_score_min: Number(e.target.value) })} /></div>
            <div><Label>Retenção (dias) de conteúdos sem alerta confirmado</Label><Input type="number" value={p.retencao_dias} onChange={(e) => setP({ ...p, retencao_dias: Number(e.target.value) })} /></div>
            <div><Label>Frequência de varredura (horas)</Label><Input type="number" value={p.frequencia_horas} onChange={(e) => setP({ ...p, frequencia_horas: Number(e.target.value) })} /></div>
            <Button onClick={() => { actions.setParams(p); toast.success("Parâmetros salvos"); }}>Salvar</Button>
          </div>
        </div></TabsContent>
        <TabsContent value="a"><div className="glass overflow-x-auto"><table className="rtable">
          <thead><tr><th>Quando</th><th>Usuário</th><th>Ação</th><th>Entidade</th></tr></thead>
          <tbody>{s.audit.map((l) => <tr key={l.id}><td className="whitespace-nowrap text-xs text-muted-foreground">{fmtDate(l.em)}</td><td>{l.user}</td><td>{l.acao}</td><td className="font-mono text-xs">{l.entidade}:{l.entidade_id}</td></tr>)}
            {!s.audit.length && <tr><td colSpan={4} className="p-6 text-center text-muted-foreground">Nenhum evento nesta sessão ainda.</td></tr>}</tbody></table></div></TabsContent>
      </Tabs>
    </>
  );
}
