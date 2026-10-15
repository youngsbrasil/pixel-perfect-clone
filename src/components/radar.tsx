import type { ReactNode } from "react";
import { Area, AreaChart, ResponsiveContainer } from "recharts";
import { cn } from "@/lib/utils";
import type { AlertStatus, Gravidade } from "@/lib/types";
import { GRAV_LABEL, STATUS_LABEL } from "@/lib/types";

const sev: Record<Gravidade, string> = {
  alta: "bg-sev-alta/12 text-sev-alta ring-sev-alta/30",
  media: "bg-sev-media/12 text-sev-media ring-sev-media/30",
  baixa: "bg-sev-baixa/12 text-sev-baixa ring-sev-baixa/30",
};
export function SevBadge({ g }: { g: Gravidade }) {
  return <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset", sev[g])}>{GRAV_LABEL[g]}</span>;
}
const st: Record<AlertStatus, string> = {
  novo: "bg-primary/12 text-primary ring-primary/30",
  em_analise: "bg-sev-media/12 text-sev-media ring-sev-media/30",
  confirmado: "bg-sev-alta/12 text-sev-alta ring-sev-alta/30",
  falso_positivo: "bg-muted text-muted-foreground ring-border",
  encaminhado_ted: "bg-foreground text-background ring-foreground/20",
  arquivado: "bg-muted text-muted-foreground ring-border",
};
export function StatusBadge({ s }: { s: AlertStatus }) {
  return <span className={cn("inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset", st[s])}>{STATUS_LABEL[s]}</span>;
}
export function Tag({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn("inline-flex rounded-full bg-secondary/70 px-2 py-0.5 text-[11px] text-secondary-foreground ring-1 ring-inset ring-border", className)}>{children}</span>;
}
export function PageHeader({ title, desc, children }: { title: string; desc?: string; children?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-sans text-[1.65rem] font-semibold tracking-tight">{title}</h1>
        {desc && <p className="mt-1 text-sm text-muted-foreground">{desc}</p>}
      </div>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}
export function Score({ v }: { v: number }) {
  const c = v >= 60 ? "bg-sev-alta" : v >= 30 ? "bg-sev-media" : "bg-sev-baixa";
  const glow = v >= 60 ? "shadow-[0_0_8px_rgb(248_113_113/0.5)]" : v >= 30 ? "shadow-[0_0_8px_rgb(251_191_36/0.45)]" : "shadow-[0_0_8px_rgb(96_165_250/0.45)]";
  return (
    <div className="flex items-center gap-2">
      <div className="pbar w-16"><div className={cn(c, glow)} style={{ width: `${v}%` }} /></div>
      <span className="num font-mono text-xs">{v}</span>
    </div>
  );
}
/** Sparkline de área com gradiente (KPIs). */
export function Spark({ data, color, id }: { data: number[]; color: string; id: string }) {
  const pts = data.map((v, i) => ({ i, v }));
  return (
    <div className="h-10 w-full">
      <ResponsiveContainer>
        <AreaChart data={pts} margin={{ top: 2, bottom: 0, left: 0, right: 0 }}>
          <defs>
            <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.45} />
              <stop offset="100%" stopColor={color} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <Area type="monotone" dataKey="v" stroke={color} strokeWidth={1.8} fill={`url(#${id})`} isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
/** Chip de ícone colorido. */
export function Chip({ color, children, className }: { color: "blue" | "green" | "purple" | "amber" | "red" | "pink" | "slate"; children: ReactNode; className?: string }) {
  return <span className={cn("kpi-chip", `chip-${color}`, className)}>{children}</span>;
}
export const fmtDate = (s: string) => new Date(s).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });
export const fmtDay = (s: string) => new Date(s).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "America/Sao_Paulo" });

export function Highlight({ text, trecho }: { text: string; trecho: string }) {
  const i = trecho ? text.toLowerCase().indexOf(trecho.toLowerCase()) : -1;
  if (i < 0) return <>{text}</>;
  return <>{text.slice(0, i)}<mark className="rounded bg-highlight px-0.5 text-foreground">{text.slice(i, i + trecho.length)}</mark>{text.slice(i + trecho.length)}</>;
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
