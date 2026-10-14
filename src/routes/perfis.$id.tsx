import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader, Score, SevBadge, StatusBadge, Tag, fmtDate } from "@/components/radar";
import { actions } from "@/lib/store";
import { useScoped } from "@/lib/scope";

export const Route = createFileRoute("/perfis/$id")({
  head: () => ({ meta: [
    { title: "Detalhe do perfil — Radar Ético" }, { name: "description", content: "Dados coletados, conteúdos e alertas do perfil." },
    { property: "og:title", content: "Detalhe do perfil — Radar Ético" }, { property: "og:description", content: "Dados do perfil monitorado." },
  ] }),
  component: Perfil,
});

function Perfil() {
  const { id } = Route.useParams();
  const { s, profiles } = useScoped();
  useEffect(() => { actions.viewPersonalData(id); }, [id]);
  const p = profiles.find((x) => x.id === id);
  if (!p) return <p className="text-muted-foreground">Perfil não encontrado ou fora da sua seccional.</p>;
  const l = s.lawyers.find((x) => x.profile_id === p.id)!;
  const cs = s.contents.filter((c) => c.profile_id === p.id); const as = s.alerts.filter((a) => a.profile_id === p.id);
  const hist = s.audit.filter((x) => x.entidade_id === p.id || as.some((a) => a.id === x.entidade_id));
  const dp = (label: string, items: { valor: string; fonte: string }[]) => (
    <div className="border-t py-1.5 text-sm"><div className="text-xs text-muted-foreground">{label}</div>
      {items.length ? items.map((i) => <div key={i.valor} className="flex justify-between gap-2"><span className="break-all">{i.valor}</span><Tag>fonte: {i.fonte}</Tag></div>) : <span className="text-muted-foreground">—</span>}</div>);
  return (
    <>
      <PageHeader title={`@${p.username}`} desc={`${p.nome_exibido} · ${p.rede} · ${p.seguidores.toLocaleString("pt-BR")} seguidores · ${p.uf_provavel}`} />
      <div className="grid gap-4 lg:grid-cols-3">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Dados coletados</CardTitle></CardHeader><CardContent>
          <p className="mb-2 text-sm">{p.bio}</p>
          {dp("OAB", l.oab_numero ? [{ valor: `${l.oab_numero}/${l.oab_uf} (${l.oab_validacao})`, fonte: "bio" }] : [])}
          {dp("Telefones", l.telefones)}{dp("WhatsApp", l.whatsapp)}{dp("E-mails", l.emails)}{dp("Site", l.site ? [l.site] : [])}
          <div className="border-t pt-2 text-xs text-muted-foreground">Finalidade: fiscalização ética (Provimento 205/2021). Apenas dados públicos.</div>
        </CardContent></Card>
        <Card className="lg:col-span-2"><CardHeader className="pb-2"><CardTitle className="text-sm">Identificação</CardTitle></CardHeader><CardContent className="space-y-3">
          <div className="flex gap-8"><div><div className="text-xs text-muted-foreground">Score de advogado</div><Score v={p.lawyer_score} /></div><div><div className="text-xs text-muted-foreground">Score de risco</div><Score v={p.risco_score} /></div></div>
          <div className="flex flex-wrap gap-1">{p.sinais_identificacao.map((x) => <Tag key={x}>{x}</Tag>)}</div>
          <Tabs defaultValue="c"><TabsList><TabsTrigger value="c">Conteúdos ({cs.length})</TabsTrigger><TabsTrigger value="a">Alertas ({as.length})</TabsTrigger><TabsTrigger value="h">Histórico</TabsTrigger></TabsList>
            <TabsContent value="c" className="space-y-2">{cs.map((c) => <div key={c.id} className="rounded-md border p-2 text-sm"><div className="mb-1 flex gap-2 text-xs text-muted-foreground"><Tag>{c.tipo}</Tag>{fmtDate(c.publicado_em)}</div>{c.texto}</div>)}</TabsContent>
            <TabsContent value="a" className="space-y-1">{as.map((a) => <Link key={a.id} to="/alertas/$id" params={{ id: a.id }} className="flex items-center gap-2 rounded-md border p-2 text-sm hover:bg-muted/40"><SevBadge g={a.gravidade} /><span className="font-mono text-xs">{s.rules.find((r) => r.id === a.rule_id)?.codigo}</span><span className="flex-1 truncate">“{a.trecho_detectado}”</span><StatusBadge s={a.status} /></Link>)}{!as.length && <p className="text-sm text-muted-foreground">Sem alertas.</p>}</TabsContent>
            <TabsContent value="h" className="space-y-1 text-sm">{hist.map((h) => <div key={h.id} className="border-b py-1"><span className="text-xs text-muted-foreground">{fmtDate(h.em)} · {h.user}</span> — {h.acao}</div>)}</TabsContent>
          </Tabs>
        </CardContent></Card>
      </div>
    </>
  );
}
