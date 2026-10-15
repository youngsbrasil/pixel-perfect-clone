import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { PageHeader, Tag } from "@/components/radar";
import { actions } from "@/lib/store";
import { useScoped } from "@/lib/scope";
import { REDES, type Rede } from "@/lib/types";

export const Route = createFileRoute("/fontes")({
  head: () => ({ meta: [
    { title: "Fontes de descoberta — Radar Ético" }, { name: "description", content: "Hashtags, termos e listas de perfis usados pelo robô." },
    { property: "og:title", content: "Fontes de descoberta — Radar Ético" }, { property: "og:description", content: "Hashtags e termos do robô." },
  ] }),
  component: Fontes,
});

function Fontes() {
  const { s, canAdmin } = useScoped();
  const [v, setV] = useState(""); const [rede, setRede] = useState<Rede>("instagram");
  const add = () => { if (!v.trim()) return; actions.addSource({ valor: v.trim(), rede, tipo: v.startsWith("#") ? "hashtag" : v.startsWith("@") ? "perfil" : "termo", ativo: true }); setV(""); };
  const csv = async (f: File) => {
    const lines = (await f.text()).split(/[\n,;]/).map((x) => x.trim()).filter((x) => x.startsWith("@"));
    lines.forEach((l) => actions.addSource({ valor: l, rede, tipo: "perfil", ativo: true }));
    toast.success(`${lines.length} perfil(is) importado(s)`);
  };
  return (
    <>
      <PageHeader title="Fontes de descoberta" desc="Hashtags e termos que o robô usa para encontrar perfis." />
      {canAdmin && <div className="glass mb-4 flex flex-wrap items-center gap-2 p-3">
        <Input value={v} onChange={(e) => setV(e.target.value)} placeholder="#hashtag, termo ou @perfil" className="w-64" onKeyDown={(e) => e.key === "Enter" && add()} />
        <Select value={rede} onValueChange={(x) => setRede(x as Rede)}><SelectTrigger className="w-36"><SelectValue /></SelectTrigger><SelectContent>{REDES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent></Select>
        <Button onClick={add}>Adicionar</Button>
        <label className="ml-auto inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-muted"><Upload className="h-4 w-4" />Importar CSV de @
          <input type="file" accept=".csv,.txt" className="hidden" onChange={(e) => e.target.files?.[0] && csv(e.target.files[0])} /></label>
      </div>}
      <div className="glass overflow-x-auto"><table className="rtable">
        <thead><tr><th>Valor</th><th>Tipo</th><th>Rede</th><th>Ativa</th><th /></tr></thead>
        <tbody>{s.sources.map((x) => <tr key={x.id}><td className="font-mono text-xs">{x.valor}</td><td><Tag>{x.tipo}</Tag></td><td className="capitalize text-muted-foreground">{x.rede}</td>
          <td><Switch checked={x.ativo} disabled={!canAdmin} onCheckedChange={() => actions.toggleSource(x.id)} /></td>
          <td>{canAdmin && <Button size="icon" variant="ghost" onClick={() => actions.removeSource(x.id)}><Trash2 className="h-4 w-4" /></Button>}</td></tr>)}</tbody></table></div>
    </>
  );
}
