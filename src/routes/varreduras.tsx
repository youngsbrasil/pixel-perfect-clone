import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader, Tag, fmtDate } from "@/components/radar";
import { actions } from "@/lib/store";
import { useScoped } from "@/lib/scope";

export const Route = createFileRoute("/varreduras")({
  head: () => ({ meta: [
    { title: "Varreduras — Radar Ético" }, { name: "description", content: "Histórico de jobs de descoberta, coleta e análise." },
    { property: "og:title", content: "Varreduras — Radar Ético" }, { property: "og:description", content: "Histórico de varreduras." },
  ] }),
  component: Varreduras,
});

function Varreduras() {
  const { s, canAdmin } = useScoped(); const [busy, setBusy] = useState(false);
  const run = async () => { setBusy(true); const n = await actions.runScan(); setBusy(false); toast.success(`Varredura concluída: ${n} item(ns) processado(s)`); };
  const maxItens = Math.max(1, ...s.jobs.map((j) => j.itens_processados));
  return (
    <>
      <PageHeader title="Varreduras" desc={`Frequência configurada: a cada ${s.params.frequencia_horas}h · provedor simulado`}>
        {canAdmin && <Button onClick={run} disabled={busy}><Play className="h-4 w-4" />{busy ? "Executando…" : "Rodar agora"}</Button>}
      </PageHeader>
      <div className="glass overflow-x-auto"><table className="rtable">
        <thead><tr><th>Job</th><th>Tipo</th><th>Status</th><th>Início</th><th>Fim</th><th>Itens processados</th><th>Erros</th><th>Custo est.</th></tr></thead>
        <tbody>{s.jobs.map((j) => <tr key={j.id}><td className="font-mono text-xs">{j.id}</td><td className="capitalize text-muted-foreground">{j.tipo}</td>
          <td><Tag className={j.status === "falhou" ? "bg-sev-alta/15 text-sev-alta" : j.status === "concluido" ? "bg-sev-baixa/15 text-sev-baixa" : ""}>{j.status}</Tag></td>
          <td className="whitespace-nowrap text-xs text-muted-foreground">{fmtDate(j.inicio)}</td><td className="whitespace-nowrap text-xs text-muted-foreground">{j.fim ? fmtDate(j.fim) : "—"}</td>
          <td><div className="flex items-center gap-2"><div className="pbar w-24"><div className="bg-primary" style={{ width: `${(j.itens_processados / maxItens) * 100}%` }} /></div><span className="num text-xs">{j.itens_processados}</span></div></td>
          <td className="max-w-xs text-xs text-sev-alta">{j.erros.join("; ") || "—"}</td><td className="num whitespace-nowrap">R$ {j.custo_estimado.toFixed(2)}</td></tr>)}</tbody></table></div>
    </>
  );
}
