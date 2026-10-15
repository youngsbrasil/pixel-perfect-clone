import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { BellRing } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Chip, PageHeader, SevBadge, StatusBadge, fmtDate } from "@/components/radar";
import { actions } from "@/lib/store";
import { useScoped } from "@/lib/scope";
import { REDES, STATUS_LABEL, type AlertStatus, type Gravidade } from "@/lib/types";

export const Route = createFileRoute("/alertas/")({
  head: () => ({ meta: [
    { title: "Fila de alertas — Radar Ético" }, { name: "description", content: "Triagem humana de alertas de publicidade irregular." },
    { property: "og:title", content: "Fila de alertas — Radar Ético" }, { property: "og:description", content: "Triagem humana de alertas." },
  ] }),
  component: Fila,
});

const W = { alta: 3, media: 2, baixa: 1 };
const ALL = "todos";
const CHIP: Record<Gravidade, "red" | "amber" | "blue"> = { alta: "red", media: "amber", baixa: "blue" };

function F({ v, set, opts, ph }: { v: string; set: (v: string) => void; opts: [string, string][]; ph: string }) {
  return <Select value={v} onValueChange={set}><SelectTrigger className="h-8 w-40 text-xs"><SelectValue placeholder={ph} /></SelectTrigger>
    <SelectContent><SelectItem value={ALL}>{ph}: todos</SelectItem>{opts.map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent></Select>;
}

function Fila() {
  const { s, alerts, canTriage, uf } = useScoped();
  const [f, setF] = useState({ status: "novo", grav: ALL, regra: ALL, rede: ALL, uf: ALL, dias: ALL, conf: "0" });
  const [sel, setSel] = useState<string[]>([]);
  const up = (k: keyof typeof f) => (v: string) => setF({ ...f, [k]: v });
  const rows = useMemo(() => alerts.map((a) => ({ a, p: s.profiles.find((p) => p.id === a.profile_id)!, r: s.rules.find((r) => r.id === a.rule_id)! }))
    .filter(({ a, p }) => (f.status === ALL || a.status === f.status) && (f.grav === ALL || a.gravidade === f.grav) && (f.regra === ALL || a.rule_id === f.regra)
      && (f.rede === ALL || p.rede === f.rede) && (f.uf === ALL || a.seccional_uf === f.uf) && a.confianca >= Number(f.conf)
      && (f.dias === ALL || Date.parse("2026-10-15") - Date.parse(a.criado_em) <= Number(f.dias) * 86400000))
    .sort((x, y) => W[y.a.gravidade] * y.a.confianca - W[x.a.gravidade] * x.a.confianca), [alerts, s, f]);
  const all = rows.length > 0 && rows.every((r) => sel.includes(r.a.id));
  const bulk = (st: AlertStatus) => { actions.setAlertStatus(sel, st, "ação em lote"); toast.success(`${sel.length} alerta(s) atualizados`); setSel([]); };
  return (
    <>
      <PageHeader title="Fila de alertas" desc={`${rows.length} alerta(s) · ordenados por gravidade × confiança`} />
      <div className="glass mb-3 flex flex-wrap items-center gap-2 p-3">
        <F v={f.status} set={up("status")} ph="Status" opts={Object.entries(STATUS_LABEL)} />
        <F v={f.grav} set={up("grav")} ph="Gravidade" opts={[["alta", "Alta"], ["media", "Média"], ["baixa", "Baixa"]]} />
        <F v={f.regra} set={up("regra")} ph="Regra" opts={s.rules.map((r) => [r.id, `${r.codigo} ${r.nome}`])} />
        <F v={f.rede} set={up("rede")} ph="Rede" opts={REDES.map((r) => [r, r])} />
        {!uf && <F v={f.uf} set={up("uf")} ph="UF" opts={s.seccionais.map((x) => [x.uf, x.uf])} />}
        <F v={f.dias} set={up("dias")} ph="Período" opts={[["7", "Últimos 7 dias"], ["30", "Últimos 30 dias"], ["90", "Últimos 90 dias"]]} />
        <div className="flex items-center gap-1 text-xs text-muted-foreground">Confiança ≥<Input type="number" step="0.05" min="0" max="1" value={f.conf} onChange={(e) => up("conf")(e.target.value)} className="h-8 w-20 text-xs" /></div>
      </div>
      {canTriage && sel.length > 0 && (
        <div className="glass mb-3 flex items-center gap-2 p-2 text-sm">
          <span className="font-medium">{sel.length} selecionado(s)</span>
          <Select onValueChange={(u) => { actions.assign(sel, u); toast.success("Atribuído"); setSel([]); }}>
            <SelectTrigger className="h-8 w-52 text-xs"><SelectValue placeholder="Atribuir a…" /></SelectTrigger>
            <SelectContent>{s.users.filter((u) => u.role !== "leitor").map((u) => <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>)}</SelectContent>
          </Select>
          <Button size="sm" variant="outline" onClick={() => bulk("em_analise")}>Marcar em análise</Button>
          <Button size="sm" variant="outline" onClick={() => bulk("arquivado")}>Descartar (arquivar)</Button>
        </div>
      )}
      <div className="glass overflow-x-auto">
        <table className="rtable">
          <thead><tr>
            <th className="w-8">{canTriage && <Checkbox checked={all} onCheckedChange={(c) => setSel(c ? rows.map((r) => r.a.id) : [])} />}</th>
            <th>Gravidade</th><th>Regra</th><th>Perfil</th><th>Trecho</th>
            <th>Conf.</th><th>UF</th><th>Status</th><th>Criado</th></tr></thead>
          <tbody>{rows.map(({ a, p, r }) => (
            <tr key={a.id}>
              <td>{canTriage && <Checkbox checked={sel.includes(a.id)} onCheckedChange={(c) => setSel(c ? [...sel, a.id] : sel.filter((x) => x !== a.id))} />}</td>
              <td><div className="flex items-center gap-2">
                <Chip color={CHIP[a.gravidade]}><BellRing className="h-4 w-4" /></Chip>
                <SevBadge g={a.gravidade} />
              </div></td>
              <td className="font-mono text-xs">{r.codigo}</td>
              <td className="whitespace-nowrap">@{p.username} <span className="text-xs text-muted-foreground">{p.rede}</span></td>
              <td className="max-w-xs"><Link to="/alertas/$id" params={{ id: a.id }} className="line-clamp-1 hover:text-primary hover:underline">“{a.trecho_detectado}”</Link></td>
              <td className="num font-mono text-xs">{a.confianca.toFixed(2)}</td>
              <td>{a.seccional_uf}</td><td><StatusBadge s={a.status} /></td>
              <td className="whitespace-nowrap text-xs text-muted-foreground">{fmtDate(a.criado_em)}</td>
            </tr>))}
            {!rows.length && <tr><td colSpan={9} className="p-8 text-center text-muted-foreground">Nenhum alerta com esses filtros.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
