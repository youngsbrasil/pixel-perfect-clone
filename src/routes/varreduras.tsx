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
  return (
    <>
      <PageHeader title="Varreduras" desc={`Frequência configurada: a cada ${s.params.frequencia_horas}h · provedor simulado`}>
        {canAdmin && <Button onClick={run} disabled={busy}><Play className="h-4 w-4" />{busy ? "Executando…" : "Rodar agora"}</Button>}
      </PageHeader>
      <div className="rounded-md border bg-card"><table className="w-full text-sm">
        <thead className="bg-muted/60 text-left text-xs text-muted-foreground"><tr><th className="p-2">Job</th><th className="p-2">Tipo</th><th className="p-2">Status</th><th className="p-2">Início</th><th className="p-2">Fim</th><th className="p-2">Itens</th><th className="p-2">Erros</th><th className="p-2">Custo est.</th></tr></thead>
        <tbody>{s.jobs.map((j) => <tr key={j.id} className="border-t"><td className="p-2 font-mono text-xs">{j.id}</td><td className="p-2">{j.tipo}</td>
          <td className="p-2"><Tag className={j.status === "falhou" ? "bg-sev-alta/15 text-sev-alta" : ""}>{j.status}</Tag></td>
          <td className="p-2 text-xs">{fmtDate(j.inicio)}</td><td className="p-2 text-xs">{j.fim ? fmtDate(j.fim) : "—"}</td>
          <td className="p-2 tabular-nums">{j.itens_processados}</td><td className="p-2 text-xs text-sev-alta">{j.erros.join("; ")}</td><td className="p-2">R$ {j.custo_estimado.toFixed(2)}</td></tr>)}</tbody></table></div>
    </>
  );
}
