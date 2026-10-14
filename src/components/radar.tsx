import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { AlertStatus, Gravidade } from "@/lib/types";
import { GRAV_LABEL, STATUS_LABEL } from "@/lib/types";

const sev: Record<Gravidade, string> = {
  alta: "bg-sev-alta/15 text-sev-alta border-sev-alta/30",
  media: "bg-sev-media/15 text-sev-media border-sev-media/40",
  baixa: "bg-sev-baixa/15 text-sev-baixa border-sev-baixa/30",
};
export function SevBadge({ g }: { g: Gravidade }) {
  return <span className={cn("inline-flex items-center rounded-sm border px-1.5 py-0.5 text-xs font-medium", sev[g])}>{GRAV_LABEL[g]}</span>;
}
const st: Record<AlertStatus, string> = {
  novo: "bg-primary/10 text-primary", em_analise: "bg-sev-media/15 text-sev-media", confirmado: "bg-sev-alta/15 text-sev-alta",
  falso_positivo: "bg-muted text-muted-foreground", encaminhado_ted: "bg-foreground text-background", arquivado: "bg-muted text-muted-foreground",
};
export function StatusBadge({ s }: { s: AlertStatus }) {
  return <span className={cn("inline-flex rounded-sm px-1.5 py-0.5 text-xs font-medium whitespace-nowrap", st[s])}>{STATUS_LABEL[s]}</span>;
}
export function Tag({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn("inline-flex rounded-sm bg-secondary px-1.5 py-0.5 text-xs text-secondary-foreground", className)}>{children}</span>;
}
export function PageHeader({ title, desc, children }: { title: string; desc?: string; children?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b pb-4">
      <div><h1 className="text-2xl font-semibold tracking-tight">{title}</h1>{desc && <p className="mt-1 text-sm text-muted-foreground">{desc}</p>}</div>
      <div className="flex gap-2">{children}</div>
    </div>
  );
}
export function Score({ v }: { v: number }) {
  const c = v >= 60 ? "bg-sev-alta" : v >= 30 ? "bg-sev-media" : "bg-sev-baixa";
  return <div className="flex items-center gap-2"><div className="h-1.5 w-14 rounded-full bg-muted"><div className={cn("h-full rounded-full", c)} style={{ width: `${v}%` }} /></div><span className="font-mono text-xs tabular-nums">{v}</span></div>;
}
export const fmtDate = (s: string) => new Date(s).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });

export function Highlight({ text, trecho }: { text: string; trecho: string }) {
  const i = trecho ? text.toLowerCase().indexOf(trecho.toLowerCase()) : -1;
  if (i < 0) return <>{text}</>;
  return <>{text.slice(0, i)}<mark className="rounded-sm bg-highlight px-0.5 text-foreground">{text.slice(i, i + trecho.length)}</mark>{text.slice(i + trecho.length)}</>;
}

export function downloadCSV(name: string, rows: Record<string, unknown>[]) {
  if (!rows.length) return;
  const keys = Object.keys(rows[0]!);
  const csv = [keys.join(";"), ...rows.map((r) => keys.map((k) => `"${String(r[k] ?? "").replace(/"/g, '""')}"`).join(";"))].join("\n");
  const url = URL.createObjectURL(new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a"); a.href = url; a.download = name; a.click(); URL.revokeObjectURL(url);
}
export function printHTML(title: string, body: string) {
  const w = window.open("", "_blank"); if (!w) return;
  w.document.write(`<html><head><title>${title}</title><style>body{font-family:Georgia,serif;max-width:760px;margin:40px auto;line-height:1.5}h1{font-size:20px}table{border-collapse:collapse;width:100%}td,th{border:1px solid #999;padding:4px 6px;font-size:12px;text-align:left}.mono{font-family:monospace;font-size:11px;word-break:break-all}</style></head><body>${body}</body></html>`);
  w.document.close(); w.print();
}
