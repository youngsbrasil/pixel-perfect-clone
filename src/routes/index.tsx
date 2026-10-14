import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader, Score } from "@/components/radar";
import { useScoped } from "@/lib/scope";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { title: "Painel — Radar Ético" }, { name: "description", content: "Indicadores de monitoramento de publicidade na advocacia." },
    { property: "og:title", content: "Painel — Radar Ético" }, { property: "og:description", content: "Indicadores de alertas, regras e seccionais." },
  ] }),
  component: Dashboard,
});

function Kpi({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return <Card><CardContent className="p-4"><div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div><div className="mt-1 font-serif text-3xl font-semibold tabular-nums">{value}</div>{hint && <div className="text-xs text-muted-foreground">{hint}</div>}</CardContent></Card>;
}

function Dashboard() {
  const { s, profiles, alerts, uf } = useScoped();
  const d = useMemo(() => {
    const ativos = profiles.filter((p) => p.status_monitoramento === "ativo").length;
    const novos = alerts.filter((a) => a.status === "novo").length;
    const conf = alerts.filter((a) => a.status === "confirmado" || a.status === "encaminhado_ted").length;
    const julg = alerts.filter((a) => ["confirmado", "encaminhado_ted", "falso_positivo"].includes(a.status)).length;
    const fp = julg ? Math.round((alerts.filter((a) => a.status === "falso_positivo").length / julg) * 100) : 0;
    const days: Record<string, number> = {};
    for (let i = 27; i >= 0; i--) days[new Date(Date.UTC(2026, 9, 14) - i * 86400000).toISOString().slice(5, 10)] = 0;
    alerts.forEach((a) => { const k = a.criado_em.slice(5, 10); if (k in days) days[k]++; });
    const porRegra = s.rules.map((r) => ({ n: r.codigo, v: alerts.filter((a) => a.rule_id === r.id).length })).filter((x) => x.v);
    const porRede = Object.entries(alerts.reduce<Record<string, number>>((acc, a) => { const r = s.profiles.find((p) => p.id === a.profile_id)!.rede; acc[r] = (acc[r] ?? 0) + 1; return acc; }, {})).map(([n, v]) => ({ n, v }));
    const porUF = s.seccionais.map((x) => ({ n: x.uf, v: alerts.filter((a) => a.seccional_uf === x.uf).length })).sort((a, b) => b.v - a.v);
    const top = [...profiles].sort((a, b) => b.risco_score - a.risco_score).slice(0, 10);
    return { ativos, novos, conf, fp, dias: Object.entries(days).map(([n, v]) => ({ n, v })), porRegra, porRede, porUF, top };
  }, [s, profiles, alerts]);
  const ax = { fontSize: 11, fill: "var(--muted-foreground)" };
  const tt = { contentStyle: { background: "var(--popover)", border: "1px solid var(--border)", fontSize: 12 } };
  return (
    <>
      <PageHeader title="Painel" desc={uf ? `Seccional ${uf}` : "Visão nacional — todas as seccionais"} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Perfis monitorados" value={d.ativos} /><Kpi label="Alertas novos" value={d.novos} hint="aguardando triagem" />
        <Kpi label="Confirmados no mês" value={d.conf} /><Kpi label="Taxa de falso positivo" value={`${d.fp}%`} />
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2"><CardHeader className="pb-2"><CardTitle className="text-sm">Alertas por dia (28 dias)</CardTitle></CardHeader><CardContent className="h-56">
          <ResponsiveContainer><LineChart data={d.dias}><CartesianGrid stroke="var(--border)" vertical={false} /><XAxis dataKey="n" tick={ax} interval={3} /><YAxis tick={ax} allowDecimals={false} width={24} /><Tooltip {...tt} /><Line dataKey="v" name="Alertas" stroke="var(--chart-1)" strokeWidth={2} dot={false} /></LineChart></ResponsiveContainer>
        </CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Ranking por UF</CardTitle></CardHeader><CardContent className="h-56">
          <ResponsiveContainer><BarChart data={d.porUF} layout="vertical"><XAxis type="number" tick={ax} allowDecimals={false} /><YAxis type="category" dataKey="n" tick={ax} width={28} /><Tooltip {...tt} /><Bar dataKey="v" name="Alertas" fill="var(--chart-2)" radius={2} /></BarChart></ResponsiveContainer>
        </CardContent></Card>
        <Card className="lg:col-span-2"><CardHeader className="pb-2"><CardTitle className="text-sm">Alertas por regra</CardTitle></CardHeader><CardContent className="h-56">
          <ResponsiveContainer><BarChart data={d.porRegra}><CartesianGrid stroke="var(--border)" vertical={false} /><XAxis dataKey="n" tick={ax} /><YAxis tick={ax} allowDecimals={false} width={24} /><Tooltip {...tt} /><Bar dataKey="v" name="Alertas" fill="var(--chart-1)" radius={2} /></BarChart></ResponsiveContainer>
        </CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Alertas por rede</CardTitle></CardHeader><CardContent className="h-56">
          <ResponsiveContainer><BarChart data={d.porRede}><XAxis dataKey="n" tick={ax} /><YAxis tick={ax} allowDecimals={false} width={24} /><Tooltip {...tt} /><Bar dataKey="v" name="Alertas" fill="var(--chart-3)" radius={2} /></BarChart></ResponsiveContainer>
        </CardContent></Card>
      </div>
      <Card className="mt-4"><CardHeader className="pb-2"><CardTitle className="text-sm">Top 10 perfis de maior risco</CardTitle></CardHeader><CardContent>
        <table className="w-full text-sm"><tbody>{d.top.map((p, i) => (
          <tr key={p.id} className="border-t"><td className="w-8 py-1.5 text-muted-foreground">{i + 1}</td>
            <td><Link to="/perfis/$id" params={{ id: p.id }} className="font-medium hover:underline">@{p.username}</Link> <span className="text-muted-foreground">· {p.rede} · {p.uf_provavel}</span></td>
            <td className="w-32"><Score v={p.risco_score} /></td></tr>))}</tbody></table>
      </CardContent></Card>
    </>
  );
}
