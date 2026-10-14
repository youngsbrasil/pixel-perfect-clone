import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Highlight, PageHeader, SevBadge, StatusBadge, Tag, fmtDate, printHTML } from "@/components/radar";
import { actions } from "@/lib/store";
import { useScoped } from "@/lib/scope";
import { STATUS_LABEL } from "@/lib/types";

export const Route = createFileRoute("/alertas/$id")({
  head: () => ({ meta: [
    { title: "Detalhe do alerta — Radar Ético" }, { name: "description", content: "Evidência, regra violada e histórico do alerta." },
    { property: "og:title", content: "Detalhe do alerta — Radar Ético" }, { property: "og:description", content: "Evidência e triagem do alerta." },
  ] }),
  component: Detalhe,
});

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return <div className="grid grid-cols-[130px_1fr] gap-2 border-t py-1.5 text-sm first:border-0"><dt className="text-muted-foreground">{k}</dt><dd className="min-w-0 break-words">{v}</dd></div>;
}

function Detalhe() {
  const { id } = Route.useParams();
  const { s, alerts, canTriage } = useScoped();
  const [fp, setFp] = useState(false); const [motivo, setMotivo] = useState(""); const [com, setCom] = useState("");
  const a = alerts.find((x) => x.id === id);
  if (!a) return <p className="text-muted-foreground">Alerta não encontrado ou fora da sua seccional.</p>;
  const p = s.profiles.find((x) => x.id === a.profile_id)!; const r = s.rules.find((x) => x.id === a.rule_id)!;
  const c = s.contents.find((x) => x.id === a.content_item_id)!; const l = s.lawyers.find((x) => x.profile_id === p.id)!;
  const outros = s.alerts.filter((x) => x.profile_id === p.id && x.id !== a.id);

  const ted = () => {
    actions.setAlertStatus([a.id], "encaminhado_ted");
    printHTML(`Encaminhamento TED ${a.id}`, `<h1>Encaminhamento ao Tribunal de Ética e Disciplina — OAB/${a.seccional_uf}</h1>
      <p><b>Alerta:</b> ${a.id} · <b>Regra:</b> ${r.codigo} — ${r.nome} (v${a.rule_versao}) · <b>Gravidade:</b> ${a.gravidade}</p>
      <p><b>Fundamento:</b> ${r.fundamento_normativo}</p>
      <p><b>Perfil:</b> @${p.username} (${p.rede}) — ${p.url}</p>
      <p><b>Advogado(a):</b> ${l.nome_completo} · OAB ${l.oab_numero ?? "—"}/${l.oab_uf ?? "—"} (${l.oab_validacao})</p>
      <h2>Conteúdo capturado</h2><blockquote>${a.evidencia.texto_capturado}</blockquote>
      <table><tr><th>URL original</th><td>${a.evidencia.url_original}</td></tr><tr><th>Capturado em</th><td>${fmtDate(a.evidencia.capturado_em)}</td></tr><tr><th>Hash</th><td class="mono">${a.evidencia.hash_sha256}</td></tr></table>
      <h2>Análise</h2><p>${a.justificativa_ia}</p>
      <h2>Histórico</h2><ul>${a.eventos.map((e) => `<li>${fmtDate(e.em)} — ${e.autor}: ${e.texto}</li>`).join("")}</ul>`);
  };

  return (
    <>
      <PageHeader title={`Alerta ${a.id.toUpperCase()}`} desc={`${r.codigo} · ${r.nome}`}>
        {canTriage && <>
          <Button variant="outline" onClick={() => { actions.setAlertStatus([a.id], "em_analise"); }}>Em análise</Button>
          <Button variant="destructive" onClick={() => { actions.setAlertStatus([a.id], "confirmado"); toast.success("Alerta confirmado"); }}>Confirmar</Button>
          <Button variant="outline" onClick={() => setFp(true)}>Falso positivo</Button>
          <Button onClick={ted}>Encaminhar ao TED (PDF)</Button>
        </>}
      </PageHeader>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card><CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm">Conteúdo original <SevBadge g={a.gravidade} /><StatusBadge s={a.status} /></CardTitle></CardHeader>
            <CardContent><p className="rounded-md border bg-muted/40 p-4 text-base leading-relaxed"><Highlight text={c.texto} trecho={a.trecho_detectado} /></p>
              <div className="mt-2 flex gap-1">{c.hashtags.map((h) => <Tag key={h}>{h}</Tag>)}<Tag>{c.tipo}</Tag></div></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Regra violada</CardTitle></CardHeader><CardContent><dl>
            <Row k="Regra" v={<><span className="font-mono">{r.codigo}</span> — {r.nome} (versão {a.rule_versao})</>} />
            <Row k="Descrição" v={r.descricao} /><Row k="Fundamento" v={r.fundamento_normativo} />
            <Row k="Justificativa" v={a.justificativa_ia} /><Row k="Confiança" v={<span className="font-mono">{a.confianca.toFixed(2)}</span>} />
          </dl></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Evidência (cadeia de custódia)</CardTitle></CardHeader><CardContent><dl>
            <Row k="Print" v={<span className="text-muted-foreground">Captura de tela disponível com a coleta real</span>} />
            <Row k="URL original" v={<a href={a.evidencia.url_original} target="_blank" rel="noreferrer" className="underline">{a.evidencia.url_original}</a>} />
            <Row k="Hash" v={<span className="font-mono text-xs">{a.evidencia.hash_sha256}</span>} />
            <Row k="Capturado em" v={fmtDate(a.evidencia.capturado_em)} />
          </dl></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Linha do tempo e comentários internos</CardTitle></CardHeader><CardContent>
            <ol className="space-y-2 text-sm">{a.eventos.map((e, i) => <li key={i} className="border-l-2 pl-3"><div className="text-xs text-muted-foreground">{fmtDate(e.em)} · {e.autor} · {e.tipo}</div>{e.texto}</li>)}</ol>
            {canTriage && <div className="mt-3 flex gap-2"><Textarea value={com} onChange={(e) => setCom(e.target.value)} placeholder="Comentário interno…" rows={2} />
              <Button disabled={!com.trim()} onClick={() => { actions.comment(a.id, com); setCom(""); }}>Enviar</Button></div>}
          </CardContent></Card>
        </div>
        <div className="space-y-4">
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Advogado(a)</CardTitle></CardHeader><CardContent><dl>
            <Row k="Nome" v={l.nome_completo} /><Row k="OAB" v={`${l.oab_numero ?? "—"} / ${l.oab_uf ?? "—"}`} /><Row k="Validação CNA" v={l.oab_validacao} />
            <Row k="Perfil" v={<Link to="/perfis/$id" params={{ id: p.id }} className="underline">@{p.username}</Link>} /><Row k="Rede" v={p.rede} /><Row k="Seguidores" v={p.seguidores.toLocaleString("pt-BR")} />
          </dl></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Histórico do perfil ({outros.length})</CardTitle></CardHeader><CardContent className="space-y-1.5">
            {outros.map((o) => <Link key={o.id} to="/alertas/$id" params={{ id: o.id }} className="flex items-center justify-between gap-2 text-sm hover:underline">
              <span className="font-mono text-xs">{s.rules.find((x) => x.id === o.rule_id)?.codigo}</span><span className="text-xs text-muted-foreground">{STATUS_LABEL[o.status]}</span></Link>)}
            {!outros.length && <p className="text-sm text-muted-foreground">Sem outros alertas.</p>}
          </CardContent></Card>
        </div>
      </div>
      <Dialog open={fp} onOpenChange={setFp}><DialogContent><DialogHeader><DialogTitle>Marcar como falso positivo</DialogTitle></DialogHeader>
        <p className="text-sm text-muted-foreground">O conteúdo será adicionado como exemplo negativo da regra {r.codigo}, gerando nova versão.</p>
        <Textarea value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Motivo (obrigatório)" />
        <DialogFooter><Button disabled={!motivo.trim()} onClick={() => { actions.setAlertStatus([a.id], "falso_positivo", motivo); setFp(false); setMotivo(""); toast.success("Marcado como falso positivo"); }}>Confirmar</Button></DialogFooter>
      </DialogContent></Dialog>
    </>
  );
}
