import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Highlight, PageHeader, SevBadge, Tag } from "@/components/radar";
import { useApp } from "@/lib/store";
import { analyzeText, classifyLawyer, enrich, type Match } from "@/lib/engine";

export const Route = createFileRoute("/analise")({
  head: () => ({ meta: [
    { title: "Análise manual — Radar Ético" }, { name: "description", content: "Análise imediata de texto, perfil ou post." },
    { property: "og:title", content: "Análise manual — Radar Ético" }, { property: "og:description", content: "Rode a análise na hora." },
  ] }),
  component: Analise,
});

function Analise() {
  const s = useApp();
  const [t, setT] = useState(""); const [r, setR] = useState<{ m: Match[]; c: ReturnType<typeof classifyLawyer>; e: ReturnType<typeof enrich>; src: string } | null>(null);
  const run = () => setR({ m: analyzeText(t, s.rules), c: classifyLawyer(t, "", []), e: enrich(t, t.match(/https?:\/\/\S+/g) ?? []), src: t });
  return (
    <>
      <PageHeader title="Análise manual" desc="Cole o texto de um post/bio ou a URL de um perfil/post." />
      <div className="glass space-y-3 p-4">
        <Textarea rows={6} value={t} onChange={(e) => setT(e.target.value)} placeholder="Ex.: Advogada | OAB/SP 123.456 — Primeira consulta gratuita, chama no direct!" />
        <div className="flex items-center gap-3"><Button onClick={run} disabled={!t.trim()}>Analisar agora</Button>
          <span className="text-xs text-muted-foreground">URLs são analisadas pelo texto colado; a coleta automática da URL entra com a integração real.</span></div>
      </div>
      {r && <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="glass space-y-2 p-4"><h3 className="font-sans text-[15px] font-semibold tracking-tight">Regras disparadas ({r.m.length})</h3>
          <p className="rounded-lg bg-muted/40 p-3 text-sm"><Highlight text={r.src} trecho={r.m[0]?.trecho ?? ""} /></p>
          {r.m.map((m) => <div key={m.rule.id} className="rounded-lg bg-muted/30 p-2 text-sm"><div className="flex items-center gap-2"><span className="font-mono text-xs">{m.rule.codigo}</span>{m.rule.nome}<SevBadge g={m.rule.gravidade} /><span className="num ml-auto font-mono text-xs">{m.confianca.toFixed(2)}</span></div><p className="mt-1 text-xs text-muted-foreground">{m.justificativa}</p></div>)}
          <p className="text-xs text-muted-foreground">Camada de IA semântica: disponível após ativar o backend.</p>
        </div>
        <div className="glass space-y-2 p-4"><h3 className="font-sans text-[15px] font-semibold tracking-tight">Identificação e dados</h3>
          <div className="text-sm">Score de advogado: <b className="num">{r.c.score}</b></div>
          <div className="flex flex-wrap gap-1">{r.c.sinais.map((x) => <Tag key={x}>{x}</Tag>)}</div>
          <div className="text-sm">OAB: {r.e.oab ? `${r.e.oab.numero}/${r.e.oab.uf}` : "—"}</div>
          <div className="text-sm">Telefones: {r.e.telefones.map((x) => x.valor).join(", ") || "—"}</div>
          <div className="text-sm">E-mails: {r.e.emails.map((x) => x.valor).join(", ") || "—"}</div>
          <div className="text-sm">WhatsApp: {r.e.whatsapp.map((x) => x.valor).join(", ") || "—"}</div>
        </div>
      </div>}
    </>
  );
}
