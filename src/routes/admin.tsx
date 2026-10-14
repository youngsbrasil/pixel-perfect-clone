import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader, fmtDate } from "@/components/radar";
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
        <TabsContent value="u"><div className="rounded-md border bg-card"><table className="w-full text-sm">
          <thead className="bg-muted/60 text-left text-xs text-muted-foreground"><tr><th className="p-2">Nome</th><th className="p-2">E-mail</th><th className="p-2">Papel</th><th className="p-2">Seccional</th></tr></thead>
          <tbody>{users.map((u) => <tr key={u.id} className="border-t"><td className="p-2">{u.nome}</td><td className="p-2">{u.email}</td>
            <td className="p-2"><Select value={u.role} onValueChange={(r) => actions.setUserRole(u.id, r as Role, r === "admin_nacional" ? null : u.seccional_uf ?? "SP")}><SelectTrigger className="h-8 w-44"><SelectValue /></SelectTrigger>
              <SelectContent>{(Object.keys(ROLE_LABEL) as Role[]).filter((r) => nat || r !== "admin_nacional").map((r) => <SelectItem key={r} value={r}>{ROLE_LABEL[r]}</SelectItem>)}</SelectContent></Select></td>
            <td className="p-2">{nat ? <Select value={u.seccional_uf ?? "—"} onValueChange={(v) => actions.setUserRole(u.id, u.role, v === "—" ? null : v)}><SelectTrigger className="h-8 w-24"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="—">—</SelectItem>{s.seccionais.map((x) => <SelectItem key={x.uf} value={x.uf}>{x.uf}</SelectItem>)}</SelectContent></Select> : u.seccional_uf}</td></tr>)}</tbody></table></div></TabsContent>
        <TabsContent value="s"><div className="grid gap-2 sm:grid-cols-5">{s.seccionais.map((x) => <Card key={x.uf}><CardContent className="p-4"><div className="font-serif text-2xl font-semibold">{x.uf}</div><div className="text-sm text-muted-foreground">{x.nome}</div><div className="mt-2 text-xs">{s.profiles.filter((p) => p.uf_provavel === x.uf).length} perfis · {s.alerts.filter((a) => a.seccional_uf === x.uf).length} alertas</div></CardContent></Card>)}</div></TabsContent>
        <TabsContent value="p"><Card className="max-w-lg"><CardHeader><CardTitle className="text-sm">Parâmetros globais</CardTitle></CardHeader><CardContent className="grid gap-3">
          <div><Label>Limiar global de confiança</Label><Input type="number" step="0.05" value={p.limiar_global} onChange={(e) => setP({ ...p, limiar_global: Number(e.target.value) })} /></div>
          <div><Label>Score mínimo para monitorar perfil</Label><Input type="number" value={p.lawyer_score_min} onChange={(e) => setP({ ...p, lawyer_score_min: Number(e.target.value) })} /></div>
          <div><Label>Retenção (dias) de conteúdos sem alerta confirmado</Label><Input type="number" value={p.retencao_dias} onChange={(e) => setP({ ...p, retencao_dias: Number(e.target.value) })} /></div>
          <div><Label>Frequência de varredura (horas)</Label><Input type="number" value={p.frequencia_horas} onChange={(e) => setP({ ...p, frequencia_horas: Number(e.target.value) })} /></div>
          <Button onClick={() => { actions.setParams(p); toast.success("Parâmetros salvos"); }}>Salvar</Button>
        </CardContent></Card></TabsContent>
        <TabsContent value="a"><div className="rounded-md border bg-card"><table className="w-full text-sm">
          <thead className="bg-muted/60 text-left text-xs text-muted-foreground"><tr><th className="p-2">Quando</th><th className="p-2">Usuário</th><th className="p-2">Ação</th><th className="p-2">Entidade</th></tr></thead>
          <tbody>{s.audit.map((l) => <tr key={l.id} className="border-t"><td className="p-2 text-xs">{fmtDate(l.em)}</td><td className="p-2">{l.user}</td><td className="p-2">{l.acao}</td><td className="p-2 font-mono text-xs">{l.entidade}:{l.entidade_id}</td></tr>)}
            {!s.audit.length && <tr><td colSpan={4} className="p-6 text-center text-muted-foreground">Nenhum evento nesta sessão ainda.</td></tr>}</tbody></table></div></TabsContent>
      </Tabs>
    </>
  );
}
