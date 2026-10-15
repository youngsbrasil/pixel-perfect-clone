import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader, downloadCSV, fmtDate, printHTML } from "@/components/radar";
import { useScoped } from "@/lib/scope";
import { STATUS_LABEL } from "@/lib/types";

export const Route = createFileRoute("/relatorios")({
  head: () => ({ meta: [
    { title: "Relatórios — Radar Ético" }, { name: "description", content: "Exportação de alertas em CSV e PDF." },
    { property: "og:title", content: "Relatórios — Radar Ético" }, { property: "og:description", content: "Exportação de relatórios." },
  ] }),
  component: Relatorios,
});

const ALL = "todos";
function Relatorios() {
  const { s, alerts, uf } = useScoped();
  const [f, setF] = useState({ de: "2026-09-01", ate: "2026-10-31", uf: ALL, regra: ALL, status: ALL });
  const rows = useMemo(() => alerts.filter((a) => a.criado_em.slice(0, 10) >= f.de && a.criado_em.slice(0, 10) <= f.ate && (f.uf === ALL || a.seccional_uf === f.uf) && (f.regra === ALL || a.rule_id === f.regra) && (f.status === ALL || a.status === f.status))
    .map((a) => { const p = s.profiles.find((x) => x.id === a.profile_id)!; const r = s.rules.find((x) => x.id === a.rule_id)!;
      return { alerta: a.id, data: fmtDate(a.criado_em), uf: a.seccional_uf, regra: r.codigo, gravidade: a.gravidade, confianca: a.confianca, status: STATUS_LABEL[a.status], perfil: `@${p.username}`, rede: p.rede, trecho: a.trecho_detectado, url: a.evidencia.url_original }; }), [alerts, s, f]);
  const sel = (k: keyof typeof f, opts: [string, string][], label: string) => <div><Label>{label}</Label><Select value={f[k]} onValueChange={(v) => setF({ ...f, [k]: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value={ALL}>Todos</SelectItem>{opts.map(([a, b]) => <SelectItem key={a} value={a}>{b}</SelectItem>)}</SelectContent></Select></div>;
  const pdf = () => printHTML("Relatório Radar Ético", `<h1>Relatório de alertas — ${f.de} a ${f.ate}</h1><p>${rows.length} alertas</p><table><tr>${Object.keys(rows[0] ?? {}).slice(0, 9).map((k) => `<th>${k}</th>`).join("")}</tr>${rows.map((r) => `<tr>${Object.values(r).slice(0, 9).map((v) => `<td>${v}</td>`).join("")}</tr>`).join("")}</table>`);
  return (
    <>
      <PageHeader title="Relatórios" desc={`${rows.length} alerta(s) no recorte`}>
        <Button variant="outline" onClick={() => downloadCSV("radar-etico-alertas.csv", rows)} disabled={!rows.length}>Exportar CSV</Button>
        <Button onClick={pdf} disabled={!rows.length}>Exportar PDF</Button>
      </PageHeader>
      <div className="glass p-4">
        <h3 className="font-sans text-[15px] font-semibold tracking-tight">Filtros</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-5">
          <div><Label>De</Label><Input type="date" value={f.de} onChange={(e) => setF({ ...f, de: e.target.value })} /></div>
          <div><Label>Até</Label><Input type="date" value={f.ate} onChange={(e) => setF({ ...f, ate: e.target.value })} /></div>
          {!uf ? sel("uf", s.seccionais.map((x) => [x.uf, x.uf]), "UF") : <div><Label>UF</Label><Input value={uf} disabled /></div>}
          {sel("regra", s.rules.map((r) => [r.id, r.codigo]), "Regra")}
          {sel("status", Object.entries(STATUS_LABEL), "Status")}
        </div>
      </div>
      <div className="glass mt-4 overflow-x-auto"><table className="rtable">
        <thead><tr>{["Alerta", "Data", "UF", "Regra", "Status", "Perfil", "Trecho"].map((h) => <th key={h}>{h}</th>)}</tr></thead>
        <tbody>{rows.slice(0, 50).map((r) => <tr key={r.alerta}><td className="font-mono text-xs">{r.alerta}</td><td className="whitespace-nowrap text-xs text-muted-foreground">{r.data}</td><td>{r.uf}</td><td className="font-mono text-xs">{r.regra}</td><td>{r.status}</td><td className="whitespace-nowrap">{r.perfil}</td><td className="max-w-xs truncate">{r.trecho}</td></tr>)}
          {!rows.length && <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">Nenhum alerta no recorte.</td></tr>}</tbody></table></div>
    </>
  );
}
