import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Copy, Pencil, Plus, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader, SevBadge, Tag, fmtDate } from "@/components/radar";
import { actions } from "@/lib/store";
import { useScoped } from "@/lib/scope";
import { analyzeText } from "@/lib/engine";
import type { Rule } from "@/lib/types";

export const Route = createFileRoute("/regras")({
  head: () => ({ meta: [
    { title: "Regras de irregularidade — Radar Ético" }, { name: "description", content: "Cadastro, versionamento e teste de regras." },
    { property: "og:title", content: "Regras — Radar Ético" }, { property: "og:description", content: "Regras configuráveis de publicidade irregular." },
  ] }),
  component: Regras,
});

const blank = (): Rule => ({ id: `r${Date.now()}`, codigo: "", nome: "", descricao: "", categoria: "", fundamento_normativo: "Provimento 205/2021", tipo_deteccao: "palavra_chave",
  padroes: [], exemplos_positivos: [], exemplos_negativos: [], gravidade: "media", peso_score: 15, limiar_confianca: 0.7, redes_aplicaveis: [], escopo: "nacional", ativo: true, versao: 0 });

function Regras() {
  const { s, canAdmin, uf } = useScoped();
  const [ed, setEd] = useState<Rule | null>(null); const [hist, setHist] = useState<Rule | null>(null);
  const [txt, setTxt] = useState("Primeira consulta gratuita! Chama no direct.");
  const res = analyzeText(txt, s.rules);
  const lines = (k: "padroes" | "exemplos_positivos" | "exemplos_negativos") => ({ value: ed?.[k].join("\n") ?? "", onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => setEd({ ...ed!, [k]: e.target.value.split("\n").filter((x) => x.trim()) }) });
  const save = () => { if (!ed!.codigo || !ed!.nome) { toast.error("Código e nome obrigatórios"); return; } actions.saveRule(ed!, ed!.versao ? "Edição" : "Criação"); setEd(null); toast.success("Regra salva"); };
  return (
    <>
      <PageHeader title="Regras de irregularidade" desc="Editáveis pelo jurídico. Cada alteração gera nova versão.">
        {canAdmin && <Button onClick={() => setEd({ ...blank(), escopo: uf ?? "nacional" })}><Plus className="h-4 w-4" />Nova regra</Button>}
      </PageHeader>
      <div className="grid gap-4 xl:grid-cols-3">
        <div className="overflow-x-auto rounded-md border bg-card xl:col-span-2"><table className="w-full text-sm">
          <thead className="bg-muted/60 text-left text-xs text-muted-foreground"><tr><th className="p-2">Código</th><th className="p-2">Nome</th><th className="p-2">Tipo</th><th className="p-2">Grav.</th><th className="p-2">Limiar</th><th className="p-2">Escopo</th><th className="p-2">v.</th><th className="p-2">Ativa</th><th className="p-2" /></tr></thead>
          <tbody>{s.rules.map((r) => (
            <tr key={r.id} className="border-t"><td className="p-2 font-mono text-xs">{r.codigo}</td><td className="p-2">{r.nome}<div className="text-xs text-muted-foreground">{r.padroes.length} padrões · {r.exemplos_negativos.length} ex. negativos</div></td>
              <td className="p-2"><Tag>{r.tipo_deteccao}</Tag></td><td className="p-2"><SevBadge g={r.gravidade} /></td><td className="p-2 font-mono text-xs">{r.limiar_confianca}</td>
              <td className="p-2">{r.escopo}</td><td className="p-2">{r.versao}</td>
              <td className="p-2"><Switch checked={r.ativo} disabled={!canAdmin} onCheckedChange={() => actions.toggleRule(r.id)} /></td>
              <td className="p-2 whitespace-nowrap">
                <Button size="icon" variant="ghost" title="Histórico" onClick={() => setHist(r)}><History className="h-4 w-4" /></Button>
                {canAdmin && <><Button size="icon" variant="ghost" title="Editar" onClick={() => setEd(structuredClone(r))}><Pencil className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" title="Duplicar" onClick={() => setEd({ ...structuredClone(r), id: `r${Date.now()}`, codigo: `${r.codigo}-COPIA`, versao: 0 })}><Copy className="h-4 w-4" /></Button></>}
              </td></tr>))}</tbody></table></div>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Testador de regra</CardTitle></CardHeader><CardContent className="space-y-3">
          <Textarea rows={5} value={txt} onChange={(e) => setTxt(e.target.value)} placeholder="Cole um texto…" />
          {res.length ? res.map((m) => <div key={m.rule.id} className="rounded-md border p-2 text-sm"><div className="flex items-center gap-2"><span className="font-mono text-xs">{m.rule.codigo}</span><SevBadge g={m.rule.gravidade} /><span className="ml-auto font-mono text-xs">conf. {m.confianca.toFixed(2)}</span></div><div className="mt-1 text-xs text-muted-foreground">Trecho: “{m.trecho}”</div></div>)
            : <p className="text-sm text-muted-foreground">Nenhuma regra disparou.</p>}
        </CardContent></Card>
      </div>

      <Dialog open={!!ed} onOpenChange={(o) => !o && setEd(null)}><DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader><DialogTitle>{ed?.versao ? `Editar ${ed.codigo}` : "Nova regra"}</DialogTitle></DialogHeader>
        {ed && <div className="grid grid-cols-2 gap-3">
          <div><Label>Código</Label><Input value={ed.codigo} onChange={(e) => setEd({ ...ed, codigo: e.target.value })} /></div>
          <div><Label>Nome</Label><Input value={ed.nome} onChange={(e) => setEd({ ...ed, nome: e.target.value })} /></div>
          <div className="col-span-2"><Label>Descrição</Label><Textarea rows={2} value={ed.descricao} onChange={(e) => setEd({ ...ed, descricao: e.target.value })} /></div>
          <div className="col-span-2"><Label>Fundamento normativo</Label><Input value={ed.fundamento_normativo} onChange={(e) => setEd({ ...ed, fundamento_normativo: e.target.value })} /></div>
          <div><Label>Tipo de detecção</Label><Select value={ed.tipo_deteccao} onValueChange={(v) => setEd({ ...ed, tipo_deteccao: v as Rule["tipo_deteccao"] })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["palavra_chave", "regex", "ia_semantica", "combinada"].map((x) => <SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent></Select></div>
          <div><Label>Gravidade</Label><Select value={ed.gravidade} onValueChange={(v) => setEd({ ...ed, gravidade: v as Rule["gravidade"] })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="alta">Alta</SelectItem><SelectItem value="media">Média</SelectItem><SelectItem value="baixa">Baixa</SelectItem></SelectContent></Select></div>
          <div><Label>Peso no score</Label><Input type="number" value={ed.peso_score} onChange={(e) => setEd({ ...ed, peso_score: Number(e.target.value) })} /></div>
          <div><Label>Limiar de confiança</Label><Input type="number" step="0.05" value={ed.limiar_confianca} onChange={(e) => setEd({ ...ed, limiar_confianca: Number(e.target.value) })} /></div>
          <div className="col-span-2"><Label>Padrões (um por linha)</Label><Textarea rows={4} {...lines("padroes")} /></div>
          <div><Label>Exemplos positivos</Label><Textarea rows={4} {...lines("exemplos_positivos")} /></div>
          <div><Label>Exemplos negativos</Label><Textarea rows={4} {...lines("exemplos_negativos")} /></div>
        </div>}
        <DialogFooter><Button onClick={save}>Salvar nova versão</Button></DialogFooter>
      </DialogContent></Dialog>

      <Dialog open={!!hist} onOpenChange={(o) => !o && setHist(null)}><DialogContent>
        <DialogHeader><DialogTitle>Histórico — {hist?.codigo}</DialogTitle></DialogHeader>
        <ol className="space-y-1 text-sm">{s.ruleVersions.filter((v) => v.rule_id === hist?.id).reverse().map((v, i) => <li key={i} className="border-b py-1"><b>v{v.versao}</b> · {fmtDate(v.em)} · {v.autor} — {v.mudanca}</li>)}</ol>
      </DialogContent></Dialog>
    </>
  );
}
