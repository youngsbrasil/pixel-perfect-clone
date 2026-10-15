import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo } from "react";
import { AlertTriangle, UserCheck } from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Chip, PageHeader, Score, SevBadge, StatusBadge, Tag, fmtDate } from "@/components/radar";
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
  const cs = s.contents.filter((c) => c.profile_id === id);
  const as = s.alerts.filter((a) => a.profile_id === id);
  const hist = s.audit.filter((x) => x.entidade_id === id || as.some((a) => a.id === x.entidade_id));
  const serie = useMemo(() => {
    const map = new Map<string, number>();
    as.forEach((a) => { const k = a.criado_em.slice(0, 7); map.set(k, (map.get(k) ?? 0) + 1); });
    return [...map.keys()].sort().slice(-6).map((k) => ({
      n: new Date(`${k}-02T12:00:00`).toLocaleDateString("pt-BR", { month: "short" }).replace(".", ""),
      v: map.get(k)!,
    }));
  }, [as]);
  if (!p) return <p className="text-muted-foreground">Perfil não encontrado ou fora da sua seccional.</p>;
  const l = s.lawyers.find((x) => x.profile_id === p.id)!;
  const ax = { fontSize: 11, fill: "#7c8db0" };
  const grid = "rgb(148 178 255 / 0.06)";
  const dp = (label: string, items: { valor: string; fonte: string }[]) => (
    <div className="border-t py-1.5 text-sm first:border-0"><div className="text-xs text-muted-foreground">{label}</div>
      {items.length ? items.map((i) => <div key={i.valor} className="flex justify-between gap-2"><span className="break-all">{i.valor}</span><Tag>fonte: {i.fonte}</Tag></div>) : <span className="text-muted-foreground">—</span>}</div>);
  return (
    <>
      <PageHeader title={`@${p.username}`} desc={`${p.nome_exibido} · ${p.rede} · ${p.seguidores.toLocaleString("pt-BR")} seguidores · ${p.uf_provavel}`} />
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="glass p-4">
          <h3 className="font-sans text-[15px] font-semibold tracking-tight">Dados coletados</h3>
          <p className="mb-2 mt-2 text-sm">{p.bio}</p>
          {dp("OAB", l.oab_numero ? [{ valor: `${l.oab_numero}/${l.oab_uf} (${l.oab_validacao})`, fonte: "bio" }] : [])}
          {dp("Telefones", l.telefones)}{dp("WhatsApp", l.whatsapp)}{dp("E-mails", l.emails)}{dp("Site", l.site ? [l.site] : [])}
          <div className="border-t pt-2 text-xs text-muted-foreground">Finalidade: fiscalização ética (Provimento 205/2021). Apenas dados públicos.</div>
        </div>
        <div className="space-y-4 lg:col-span-2">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="glass p-4">
              <div className="flex items-center gap-3">
                <Chip color="blue"><UserCheck className="h-5 w-5" /></Chip>
                <div className="text-[13px] font-medium text-muted-foreground">Score de advogado</div>
              </div>
              <div className="mt-3"><Score v={p.lawyer_score} /></div>
            </div>
            <div className="glass p-4">
              <div className="flex items-center gap-3">
                <Chip color="red"><AlertTriangle className="h-5 w-5" /></Chip>
                <div className="text-[13px] font-medium text-muted-foreground">Score de risco</div>
              </div>
              <div className="mt-3"><Score v={p.risco_score} /></div>
            </div>
          </div>
          <div className="glass p-4">
            <h3 className="font-sans text-[15px] font-semibold tracking-tight">Identificação</h3>
            <div className="mt-2 flex flex-wrap gap-1">{p.sinais_identificacao.map((x) => <Tag key={x}>{x}</Tag>)}</div>
            {serie.length > 0 && (
              <div className="mt-4">
                <div className="mb-1 text-xs font-medium text-muted-foreground">Alertas no tempo</div>
                <div className="h-36">
                  <ResponsiveContainer>
                    <AreaChart data={serie} margin={{ top: 4, right: 4, bottom: 0, left: -18 }}>
                      <defs>
                        <linearGradient id="gPerfil" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#f87171" stopOpacity={0.5} />
                          <stop offset="100%" stopColor="#f87171" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke={grid} vertical={false} />
                      <XAxis dataKey="n" tick={ax} tickLine={false} axisLine={false} />
                      <YAxis tick={ax} allowDecimals={false} tickLine={false} axisLine={false} />
                      <Tooltip />
                      <Area type="monotone" dataKey="v" name="Alertas" stroke="#f87171" strokeWidth={2.2} fill="url(#gPerfil)" dot={false} activeDot={{ r: 4, fill: "#f87171" }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
            <Tabs defaultValue="c" className="mt-3"><TabsList><TabsTrigger value="c">Conteúdos ({cs.length})</TabsTrigger><TabsTrigger value="a">Alertas ({as.length})</TabsTrigger><TabsTrigger value="h">Histórico</TabsTrigger></TabsList>
              <TabsContent value="c" className="space-y-2">{cs.map((c) => <div key={c.id} className="rounded-lg bg-muted/30 p-2.5 text-sm"><div className="mb-1 flex gap-2 text-xs text-muted-foreground"><Tag>{c.tipo}</Tag>{fmtDate(c.publicado_em)}</div>{c.texto}</div>)}</TabsContent>
              <TabsContent value="a" className="space-y-1">{as.map((a) => <Link key={a.id} to="/alertas/$id" params={{ id: a.id }} className="flex items-center gap-2 rounded-lg bg-muted/30 p-2 text-sm hover:bg-muted/50"><SevBadge g={a.gravidade} /><span className="font-mono text-xs">{s.rules.find((r) => r.id === a.rule_id)?.codigo}</span><span className="flex-1 truncate">“{a.trecho_detectado}”</span><StatusBadge s={a.status} /></Link>)}{!as.length && <p className="text-sm text-muted-foreground">Sem alertas.</p>}</TabsContent>
              <TabsContent value="h" className="space-y-1 text-sm">{hist.map((h) => <div key={h.id} className="border-b py-1"><span className="text-xs text-muted-foreground">{fmtDate(h.em)} · {h.user}</span> — {h.acao}</div>)}</TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </>
  );
}
