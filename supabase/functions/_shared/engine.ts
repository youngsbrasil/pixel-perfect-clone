// Radar Ético — motor de análise (porte fiel de src/lib/engine.ts para Deno).
// Não importa nada de src/: as edge functions são self-contained.

export type Rede = "instagram" | "tiktok" | "facebook" | "linkedin" | "youtube" | "x";
export type Gravidade = "baixa" | "media" | "alta";

/** Campos de `rules` usados pelo motor. */
export interface RuleRow {
  id: string;
  codigo: string;
  nome: string;
  descricao?: string | null;
  tipo_deteccao: "palavra_chave" | "regex" | "ia_semantica" | "combinada";
  padroes: string[];
  exemplos_positivos?: string[];
  exemplos_negativos: string[];
  gravidade: Gravidade;
  limiar_confianca: number;
  redes_aplicaveis: string[];
  ativo: boolean;
  fundamento_normativo?: string | null;
  versao?: number;
  peso_score?: number;
}

export interface Match {
  rule: RuleRow;
  trecho: string;
  confianca: number;
  justificativa: string;
}

/** Normaliza texto: sem acentos, minúsculas, espaços colapsados. */
export const normalize = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Regras determinísticas (palavra-chave/regex). A camada de IA semântica é separada. */
export function analyzeText(texto: string, rules: RuleRow[], rede?: string): Match[] {
  const norm = normalize(texto);
  const out: Match[] = [];
  for (const r of rules) {
    if (!r.ativo) continue;
    if (rede && r.redes_aplicaveis.length && !r.redes_aplicaveis.includes(rede)) continue;
    if (r.exemplos_negativos.some((n) => normalize(n) === norm)) continue;
    let hits = 0;
    let trecho = "";
    for (const p of r.padroes) {
      const src = r.tipo_deteccao === "palavra_chave" ? esc(normalize(p)) : p;
      let re: RegExp;
      try {
        re = new RegExp(src, "i");
      } catch {
        continue;
      }
      const m = norm.match(re);
      if (m && m.index !== undefined) {
        hits++;
        if (!trecho) trecho = texto.slice(Math.max(0, m.index), m.index + m[0].length);
      }
    }
    if (!hits) continue;
    const confianca = Math.min(
      0.99,
      (r.tipo_deteccao === "regex" ? 0.82 : 0.86) + (hits - 1) * 0.05,
    );
    if (confianca < Number(r.limiar_confianca)) continue;
    out.push({
      rule: r,
      trecho,
      confianca: Math.round(confianca * 100) / 100,
      justificativa:
        `Trecho "${trecho}" corresponde a ${hits} padrão(ões) da regra ${r.codigo} (${r.nome}). ${r.fundamento_normativo ?? ""}`.trim(),
    });
  }
  return out;
}

const OAB_RE =
  /oab\s*[/-]?\s*([a-z]{2})\s*(?:n[ºo°.]*\s*)?([\d.]{3,9})|oab\s*([\d.]{3,9})\s*\/\s*([a-z]{2})/i;

/** Extrai número e UF da OAB de um texto livre. */
export function extractOAB(text: string): { numero: string; uf: string } | null {
  const m = normalize(text).match(OAB_RE);
  if (!m) return null;
  return m[1]
    ? { uf: m[1].toUpperCase(), numero: m[2]! }
    : { uf: m[4]!.toUpperCase(), numero: m[3]! };
}

/** Calcula o lawyer_score (0–100) e os sinais de identificação de um perfil. */
export function classifyLawyer(bio: string, categoria: string, links: string[]) {
  const n = normalize(bio);
  const sinais: string[] = [];
  let score = 0;
  const oab = extractOAB(bio);
  if (oab) {
    score += 50;
    sinais.push(`bio contém OAB/${oab.uf}`);
  }
  if (/\badvogad[oa]s?\b|\badv\./.test(n)) {
    score += 20;
    sinais.push("bio contém 'advogado(a)'");
  }
  if (/\bdr[a]?\.\s/.test(n) && /(direito|juridic|previdenc|trabalhist|familia|criminal)/.test(n)) {
    score += 15;
    sinais.push("Dr./Dra. + termo jurídico");
  }
  if (normalize(categoria).includes("advogad")) {
    score += 20;
    sinais.push("categoria: Advogado");
  }
  if (/(advocacia|advogados associados|sociedade de advogados)/.test(n)) {
    score += 10;
    sinais.push("nome de escritório");
  }
  if (links.some((l) => /(adv|juridic|direito|law)/i.test(l))) {
    score += 10;
    sinais.push("link para site jurídico");
  }
  return { score: Math.min(100, score), sinais };
}

export interface DataPoint {
  valor: string;
  fonte: string;
}

/** Extrai telefones, WhatsApp, e-mails, site e OAB da bio/links. */
export function enrich(bio: string, links: string[]) {
  const all = [bio, ...links].join(" ");
  const tel = Array.from(new Set(bio.match(/\(?\d{2}\)?\s?9?\d{4}-?\d{4}/g) ?? [])).map<DataPoint>(
    (v) => ({ valor: v, fonte: "bio" }),
  );
  const wa = links
    .filter((l) => /wa\.me|api\.whatsapp\.com/.test(l))
    .map<DataPoint>((v) => ({ valor: v, fonte: "link" }));
  const emails = Array.from(new Set(all.match(/[\w.+-]+@[\w-]+\.[\w.]+/g) ?? [])).map<DataPoint>(
    (v) => ({ valor: v, fonte: "bio" }),
  );
  const siteL = links.find((l) => !/wa\.me|whatsapp|linktr/.test(l));
  return {
    telefones: tel,
    whatsapp: wa,
    emails,
    site: siteL ? { valor: siteL, fonte: "link" } : null,
    oab: extractOAB(bio),
  };
}

/** Stub: consulta ao Cadastro Nacional dos Advogados (CNA) por número + UF. */
export async function validateOAB(
  numero: string,
  uf: string,
): Promise<"pendente" | "valida" | "divergente" | "nao_encontrada"> {
  void numero;
  void uf;
  return "pendente";
}

/** SHA-256 hexadecimal (para hash de conteúdo e cadeia de custódia). */
export async function sha256hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
