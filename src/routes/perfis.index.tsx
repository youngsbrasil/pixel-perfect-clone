import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Pause, Play, EyeOff, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader, Score, Tag, fmtDate } from "@/components/radar";
import { actions } from "@/lib/store";
import { useScoped } from "@/lib/scope";

export const Route = createFileRoute("/perfis/")({
  head: () => ({ meta: [
    { title: "Perfis monitorados — Radar Ético" }, { name: "description", content: "Perfis de advogados(as) sob monitoramento." },
    { property: "og:title", content: "Perfis monitorados — Radar Ético" }, { property: "og:description", content: "Perfis sob monitoramento." },
  ] }),
  component: Perfis,
});

function Perfis() {
  const { s, profiles, alerts, canTriage } = useScoped();
  const [q, setQ] = useState("");
  const rows = profiles.filter((p) => !q || `${p.username} ${p.nome_exibido}`.toLowerCase().includes(q.toLowerCase())).sort((a, b) => b.risco_score - a.risco_score);
  const scan = async (id: string) => { const n = await actions.runScan(id); toast.success(`Varredura concluída: ${n} novo(s) conteúdo(s)`); };
  return (
    <>
      <PageHeader title="Perfis monitorados" desc={`${rows.length} perfil(is)`}><Input placeholder="Buscar @ ou nome" value={q} onChange={(e) => setQ(e.target.value)} className="h-9 w-56" /></PageHeader>
      <div className="overflow-x-auto rounded-md border bg-card"><table className="w-full text-sm">
        <thead className="bg-muted/60 text-left text-xs text-muted-foreground"><tr>
          <th className="p-2">Perfil</th><th className="p-2">Rede</th><th className="p-2">Nome</th><th className="p-2">OAB/UF</th><th className="p-2">Validação</th>
          <th className="p-2">Score adv.</th><th className="p-2">Risco</th><th className="p-2">Alertas</th><th className="p-2">Última varredura</th><th className="p-2">Status</th><th className="p-2" /></tr></thead>
        <tbody>{rows.map((p) => { const l = s.lawyers.find((x) => x.profile_id === p.id)!; return (
          <tr key={p.id} className="border-t hover:bg-muted/40">
            <td className="p-2"><Link to="/perfis/$id" params={{ id: p.id }} className="font-medium hover:underline">@{p.username}</Link></td>
            <td className="p-2">{p.rede}</td><td className="p-2 whitespace-nowrap">{p.nome_exibido}</td>
            <td className="p-2 font-mono text-xs">{l.oab_numero ? `${l.oab_numero}/${l.oab_uf}` : "—"}</td><td className="p-2"><Tag>{l.oab_validacao}</Tag></td>
            <td className="p-2"><Score v={p.lawyer_score} /></td><td className="p-2"><Score v={p.risco_score} /></td>
            <td className="p-2 tabular-nums">{alerts.filter((a) => a.profile_id === p.id).length}</td>
            <td className="p-2 text-xs whitespace-nowrap text-muted-foreground">{fmtDate(p.ultima_varredura)}</td>
            <td className="p-2"><Tag>{p.status_monitoramento}</Tag></td>
            <td className="p-2 whitespace-nowrap">{canTriage && <>
              {p.status_monitoramento === "ativo"
                ? <Button size="icon" variant="ghost" title="Pausar" onClick={() => actions.setProfileStatus(p.id, "pausado")}><Pause className="h-4 w-4" /></Button>
                : <Button size="icon" variant="ghost" title="Reativar" onClick={() => actions.setProfileStatus(p.id, "ativo")}><Play className="h-4 w-4" /></Button>}
              <Button size="icon" variant="ghost" title="Ignorar" onClick={() => actions.setProfileStatus(p.id, "ignorado")}><EyeOff className="h-4 w-4" /></Button>
              <Button size="icon" variant="ghost" title="Nova varredura" onClick={() => scan(p.id)}><RefreshCw className="h-4 w-4" /></Button></>}</td>
          </tr>); })}</tbody></table></div>
    </>
  );
}
