import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { ExternalLink, Search, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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

const SITE_POR_REDE: Record<string, string> = {
  instagram: "site:instagram.com", tiktok: "site:tiktok.com", facebook: "site:facebook.com",
  linkedin: "site:linkedin.com", youtube: "site:youtube.com", x: "site:x.com",
};

/** Monta a URL de busca externa para um termo/hashtag numa rede. */
export function buildSearchUrl(rede: string, valor: string): string {
  const site = SITE_POR_REDE[rede] ?? "";
  const termo = valor.replace(/^#/, "").trim();
  const q = `${site} "${termo}"`.trim();
  return `https://www.google.com/search?q=${encodeURIComponent(q)}`;
}

function Fontes() {
  const { s, canTriage } = useScoped();
  const [v, setV] = useState(""); const [rede, setRede] = useState<Rede>("instagram");
  const [importTxt, setImportTxt] = useState(""); const [busy, setBusy] = useState(false);
  const add = () => { if (!v.trim()) return; actions.addSource({ valor: v.trim(), rede, tipo: v.startsWith("#") ? "hashtag" : v.startsWith("@") ? "perfil" : "termo", ativo: true }); setV(""); };
  const csv = async (f: File) => {
    const lines = (await f.text()).split(/[\n,;]/).map((x) => x.trim()).filter((x) => x.startsWith("@"));
    lines.forEach((l) => actions.addSource({ valor: l, rede, tipo: "perfil", ativo: true }));
    toast.success(`${lines.length} perfil(is) importado(s)`);
  };
  const importar = async () => {
    const linhas = importTxt.split("\n").map((l) => l.trim()).filter(Boolean).map((l) => {
      const [url, ...bioParts] = l.split("|");
      const bio = bioParts.join("|").trim();
      return bio ? { url: (url ?? "").trim(), bio } : { url: (url ?? "").trim() };
    });
    if (!linhas.length) return;
    setBusy(true);
    try {
      const res = await actions.importProfiles(linhas);
      if (res.ignorados.length) toast.warning(`${res.novos} novo(s), ${res.ignorados.length} ignorado(s): ${res.ignorados[0]?.motivo ?? ""}`);
      else toast.success(`${res.novos} perfil(is) importado(s)`);
      setImportTxt("");
    } catch (e) { console.error(e); toast.error("Falha ao importar perfis."); }
    setBusy(false);
  };
  return (
    <>
      <PageHeader title="Fontes de descoberta" desc="Termos e hashtags para busca assistida; @perfis entram direto na base." />
      {canTriage && <div className="glass mb-4 flex flex-wrap items-center gap-2 p-3">
        <Input value={v} onChange={(e) => setV(e.target.value)} placeholder="#hashtag, termo ou @perfil" className="w-64" onKeyDown={(e) => e.key === "Enter" && add()} />
        <Select value={rede} onValueChange={(x) => setRede(x as Rede)}><SelectTrigger className="w-36"><SelectValue /></SelectTrigger><SelectContent>{REDES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent></Select>
        <Button onClick={add}>Adicionar</Button>
        <label className="ml-auto inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-muted"><Upload className="h-4 w-4" />Importar CSV de @
          <input type="file" accept=".csv,.txt" className="hidden" onChange={(e) => e.target.files?.[0] && csv(e.target.files[0])} /></label>
      </div>}
      {canTriage && <div className="glass mb-4 p-3">
        <p className="mb-2 text-sm font-medium">Importar perfis da busca <span className="font-normal text-muted-foreground">— uma URL por linha; bio opcional após <code>|</code></span></p>
        <Textarea value={importTxt} onChange={(e) => setImportTxt(e.target.value)} rows={3} placeholder={"https://instagram.com/adv.silva | Advogado | OAB/SP 123456 | Direito Previdenciário\nhttps://tiktok.com/@adv.silva"} className="font-mono text-xs" />
        <Button onClick={importar} disabled={busy || !importTxt.trim()} className="mt-2">{busy ? "Importando…" : "Importar perfis"}</Button>
      </div>}
      <div className="glass overflow-x-auto"><table className="rtable">
        <thead><tr><th>Valor</th><th>Tipo</th><th>Rede</th><th>Buscar</th><th>Ativa</th><th /></tr></thead>
        <tbody>{s.sources.map((x) => <tr key={x.id}><td className="font-mono text-xs">{x.valor}</td><td><Tag>{x.tipo}</Tag></td><td className="capitalize text-muted-foreground">{x.rede}</td>
          <td>{x.tipo !== "perfil"
            ? <a href={buildSearchUrl(x.rede, x.valor)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline"><Search className="h-3.5 w-3.5" />Google <ExternalLink className="h-3 w-3" /></a>
            : <span className="text-xs text-muted-foreground">direto</span>}</td>
          <td><Switch checked={x.ativo} disabled={!canTriage} onCheckedChange={() => actions.toggleSource(x.id)} /></td>
          <td>{canTriage && <Button size="icon" variant="ghost" onClick={() => actions.removeSource(x.id)}><Trash2 className="h-4 w-4" /></Button>}</td></tr>)}</tbody></table></div>
    </>
  );
}
