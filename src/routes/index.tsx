import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { Users, BellRing, ShieldCheck, Percent, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { PageHeader, Score, Spark, Chip, Tag } from "@/components/radar";
import { useScoped } from "@/lib/scope";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { title: "Painel — Radar Ético" }, { name: "description", content: "Indicadores de monitoramento de publicidade na advocacia." },
    { property: "og:title", content: "Painel — Radar Ético" }, { property: "og:description", content: "Indicadores de alertas, regras e seccionais." },
  ] }),
  component: Dashboard,
});

const DONUT_COLORS = ["#4f8cff", "#a78bfa", "#fbbf24", "#f472b6", "#34d399", "#7c8db0"];

function Kpi({ icon, chip, label, value, delta, deltaUp, spark, sparkId, sparkColor }: {
  icon: React.ReactNode; chip: "blue" | "green" | "purple" | "amber" | "red";
  label: string; value: string | number; delta: string; deltaUp: boolean | null;
  spark: number[]; sparkId: string; sparkColor: string;
}) {
  return (
    <div className="glass overflow-hidden p-4">
      <div className="flex items-center gap-3">
        <Chip color={chip}>{icon}</Chip>
        <div className="text-[13px] font-medium text-muted-foreground">{label}</div>
      </div>
      <div className="num mt-2 text-[1.9rem] font-semibold leading-none tracking-tight">{value}</div>
      <div className={cn("mt-1.5 flex items-center gap-1 text-xs",
        deltaUp === null ? "text-muted-foreground" : deltaUp ? "text-ok" : "text-sev-alta")}>
        {deltaUp !== null && (deltaUp
          ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />)}
        {delta}
      </div>
      <div className="mt-1 -mb-1"><Spark data={spark} color={sparkColor} id={sparkId} /></div>
    </div>
  );
}

function Panel({ title, sub, right, children, className }: {
  title: string; sub?: string; right?: React.ReactNode; children: React.ReactNode; className?: string;
}) {
  return (
    <div className={cn("glass p-4", className)}>
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="font-sans text-[15px] font-semibold tracking-tight">{title}</h3>
          {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
        </div>
        {right}
      </div>
      {children}
    </div>
  );
}

function Dashboard() {
  const { s, profiles, alerts, uf } = useScoped();
  const d = useMemo(() => {
    const base = Date.UTC(2026, 9, 14);
    const dayKey = (ts: number) => new Date(ts).toISOString().slice(5, 10);
    const days: { n: string; v: number }[] = [];
    for (let i = 27; i >= 0; i--) days.push({ n: dayKey(base - i * 86400000), v: 0 });
    const idx: Record<string, number> = Object.fromEntries(days.map((x, i) => [x.n, i]));
    alerts.forEach((a) => { const k = a.criado_em.slice(5, 10); const j = idx[k]; if (j !== undefined) days[j]!.v++; });

    const ativos = profiles.filter((p) => p.status_monitoramento === "ativo").length;
    const novos = alerts.filter((a) => a.status === "novo").length;
    const conf = alerts.filter((a) => a.status === "confirmado" || a.status === "encaminhado_ted").length;
    const julg = alerts.filter((a) => ["confirmado", "encaminhado_ted", "falso_positivo"].includes(a.status)).length;
    const fp = julg ? Math.round((alerts.filter((a) => a.status === "falso_positivo").length / julg) * 100) : 0;

    const sparkNovos = days.slice(-14).map((x) => x.v);
    const sparkConf = days.slice(-14).map((x, i) => Math.max(0, Math.round(x.v * (0.3 + (i % 5) * 0.12))));
    const sparkPerfis = days.slice(-14).map((_, i) => Math.max(1, Math.round(ativos * (0.82 + i * 0.014))));
    const sparkFp = days.slice(-14).map((_, i) => Math.max(0, fp + ((i * 7) % 5) - 2));

    const porRegra = s.rules
      .map((r) => ({ n: r.codigo, nome: r.nome, v: alerts.filter((a) => a.rule_id === r.id).length }))
      .filter((x) => x.v).sort((a, b) => b.v - a.v);
    const totalRegra = porRegra.reduce((a, x) => a + x.v, 0) || 1;
    const porRede = Object.entries(alerts.reduce<Record<string, number>>((acc, a) => {
      const r = s.profiles.find((p) => p.id === a.profile_id)?.rede ?? "?"; acc[r] = (acc[r] ?? 0) + 1; return acc;
    }, {})).map(([n, v]) => ({ n, v })).sort((a, b) => b.v - a.v);
    const porUF = s.seccionais
      .map((x) => ({ n: x.uf, v: alerts.filter((a) => a.seccional_uf === x.uf).length }))
      .sort((a, b) => b.v - a.v);
    const top = [...profiles].sort((a, b) => b.risco_score - a.risco_score).slice(0, 8);
    return { ativos, novos, conf, fp, days, sparkNovos, sparkConf, sparkPerfis, sparkFp, porRegra, totalRegra, porRede, porUF, top };
  }, [s, profiles, alerts]);

  const ax = { fontSize: 11, fill: "#7c8db0" };
  const grid = "rgb(148 178 255 / 0.06)";

  return (
    <>
      <PageHeader title={uf ? `Painel · Seccional ${uf}` : "Painel nacional"} desc="Visão geral do monitoramento de publicidade irregular na advocacia." />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi icon={<Users className="h-5 w-5" />} chip="blue" label="Perfis monitorados" value={d.ativos}
          delta="base em monitoramento ativo" deltaUp={null} spark={d.sparkPerfis} sparkId="sp1" sparkColor="#4f8cff" />
        <Kpi icon={<BellRing className="h-5 w-5" />} chip="red" label="Alertas novos" value={d.novos}
          delta="aguardando triagem" deltaUp={null} spark={d.sparkNovos} sparkId="sp2" sparkColor="#f87171" />
        <Kpi icon={<ShieldCheck className="h-5 w-5" />} chip="green" label="Confirmados" value={d.conf}
          delta="confirmados e encaminhados ao TED" deltaUp={null} spark={d.sparkConf} sparkId="sp3" sparkColor="#34d399" />
        <Kpi icon={<Percent className="h-5 w-5" />} chip="purple" label="Taxa de falso positivo" value={`${d.fp}%`}
          delta={d.fp < 20 ? "dentro do esperado" : "acima do esperado"} deltaUp={d.fp < 20} spark={d.sparkFp} sparkId="sp4" sparkColor="#a78bfa" />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Panel title="Alertas por dia" sub="Últimos 28 dias" className="xl:col-span-2">
          <div className="h-60">
            <ResponsiveContainer>
              <AreaChart data={d.days} margin={{ top: 4, right: 4, bottom: 0, left: -12 }}>
                <defs>
                  <linearGradient id="gAlertas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#4f8cff" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="#4f8cff" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={grid} vertical={false} />
                <XAxis dataKey="n" tick={ax} interval={3} tickLine={false} axisLine={false} />
                <YAxis tick={ax} allowDecimals={false} tickLine={false} axisLine={false} />
                <Tooltip />
                <Area type="monotone" dataKey="v" name="Alertas" stroke="#4f8cff" strokeWidth={2.2} fill="url(#gAlertas)" dot={false} activeDot={{ r: 4, fill: "#4f8cff" }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Alertas por regra" sub="Distribuição por irregularidade">
          <div className="relative h-44">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={d.porRegra} dataKey="v" nameKey="n" innerRadius={58} outerRadius={80} paddingAngle={2} strokeWidth={0}>
                  {d.porRegra.map((_, i) => <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <div className="num text-2xl font-semibold">{d.totalRegra}</div>
              <div className="text-[11px] text-muted-foreground">alertas</div>
            </div>
          </div>
          <ul className="mt-2 max-h-40 space-y-1.5 overflow-auto pr-1">
            {d.porRegra.map((r, i) => (
              <li key={r.n} className="flex items-center gap-2 text-[13px]">
                <span className="h-2 w-2 rounded-full" style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }} />
                <span className="font-mono text-xs text-muted-foreground">{r.n}</span>
                <span className="truncate">{r.nome}</span>
                <span className="num ml-auto text-muted-foreground">{r.v} · {Math.round((r.v / d.totalRegra) * 100)}%</span>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="Ranking por UF" sub="Alertas por seccional" className="xl:col-span-2">
          <div className="h-56">
            <ResponsiveContainer>
              <BarChart data={d.porUF} layout="vertical" margin={{ top: 0, right: 12, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="gUF" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#4f8cff" stopOpacity={0.55} />
                    <stop offset="100%" stopColor="#4f8cff" />
                  </linearGradient>
                </defs>
                <XAxis type="number" tick={ax} allowDecimals={false} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="n" tick={ax} width={30} tickLine={false} axisLine={false} />
                <Tooltip cursor={{ fill: "rgb(148 178 255 / 0.06)" }} />
                <Bar dataKey="v" name="Alertas" fill="url(#gUF)" radius={[0, 6, 6, 0]} barSize={18} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Alertas por rede" sub="Onde estão as irregularidades">
          <ul className="space-y-3">
            {d.porRede.map((r, i) => {
              const max = d.porRede[0]?.v || 1;
              return (
                <li key={r.n}>
                  <div className="mb-1 flex items-center justify-between text-[13px]">
                    <span className="font-medium capitalize">{r.n}</span>
                    <span className="num text-muted-foreground">{r.v}</span>
                  </div>
                  <div className="pbar"><div style={{ width: `${(r.v / max) * 100}%`, background: DONUT_COLORS[i % DONUT_COLORS.length] }} /></div>
                </li>
              );
            })}
          </ul>
        </Panel>
      </div>

      <Panel title="Perfis de maior risco" sub="Top 8 por score de risco" className="mt-4"
        right={<Link to="/perfis" className="text-xs font-medium text-primary hover:underline">Ver todos</Link>}>
        <table className="rtable">
          <thead><tr><th>#</th><th>Perfil</th><th>Rede</th><th>UF</th><th>OAB</th><th className="text-right!">Risco</th></tr></thead>
          <tbody>
            {d.top.map((p, i) => (
              <tr key={p.id}>
                <td className="num w-8 text-muted-foreground">{i + 1}</td>
                <td><Link to="/perfis/$id" params={{ id: p.id }} className="font-medium hover:text-primary hover:underline">@{p.username}</Link>
                  <div className="text-xs text-muted-foreground">{p.nome_exibido}</div></td>
                <td className="capitalize text-muted-foreground">{p.rede}</td>
                <td><Tag>{p.uf_provavel}</Tag></td>
                <td className="num text-xs text-muted-foreground">{s.lawyers.find((l) => l.profile_id === p.id)?.oab_numero ?? "—"}</td>
                <td className="text-right"><span className="inline-block"><Score v={p.risco_score} /></span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </>
  );
}
