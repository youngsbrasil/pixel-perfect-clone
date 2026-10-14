export type Rede = "instagram" | "tiktok" | "facebook" | "linkedin" | "youtube" | "x";
export type Gravidade = "baixa" | "media" | "alta";
export type AlertStatus = "novo" | "em_analise" | "confirmado" | "falso_positivo" | "encaminhado_ted" | "arquivado";
export type Role = "admin_nacional" | "admin_seccional" | "analista" | "leitor";

export interface Seccional { uf: string; nome: string }
export interface UserRole { id: string; nome: string; email: string; role: Role; seccional_uf: string | null }

export interface SocialProfile {
  id: string; rede: Rede; username: string; url: string; nome_exibido: string; bio: string;
  seguidores: number; categoria_perfil: string; links_externos: string[]; lawyer_score: number;
  sinais_identificacao: string[]; uf_provavel: string; status_monitoramento: "ativo" | "pausado" | "ignorado";
  ultima_varredura: string; risco_score: number;
}
export interface DataPoint { valor: string; fonte: string }
export interface LawyerData {
  profile_id: string; nome_completo: string; oab_numero: string | null; oab_uf: string | null;
  oab_validacao: "pendente" | "valida" | "divergente" | "nao_encontrada";
  telefones: DataPoint[]; whatsapp: DataPoint[]; emails: DataPoint[]; site: DataPoint | null; coletado_em: string;
}
export interface ContentItem {
  id: string; profile_id: string; tipo: "post" | "reels" | "story" | "bio" | "comentario" | "link";
  url: string; texto: string; hashtags: string[]; publicado_em: string; coletado_em: string; hash_conteudo: string;
}
export interface Rule {
  id: string; codigo: string; nome: string; descricao: string; categoria: string; fundamento_normativo: string;
  tipo_deteccao: "palavra_chave" | "regex" | "ia_semantica" | "combinada"; padroes: string[];
  exemplos_positivos: string[]; exemplos_negativos: string[]; gravidade: Gravidade; peso_score: number;
  limiar_confianca: number; redes_aplicaveis: Rede[]; escopo: string; ativo: boolean; versao: number;
}
export interface RuleVersion { rule_id: string; versao: number; autor: string; em: string; mudanca: string }
export interface AlertEvent { em: string; autor: string; tipo: "status" | "comentario" | "atribuicao"; texto: string }
export interface Alert {
  id: string; profile_id: string; content_item_id: string; rule_id: string; rule_versao: number;
  trecho_detectado: string; justificativa_ia: string; confianca: number; gravidade: Gravidade;
  status: AlertStatus; analista_id: string | null; seccional_uf: string; criado_em: string;
  evidencia: { screenshot_url: string | null; url_original: string; texto_capturado: string; hash_sha256: string; capturado_em: string };
  eventos: AlertEvent[];
}
export interface DiscoverySource { id: string; tipo: "hashtag" | "termo" | "perfil"; valor: string; rede: Rede; ativo: boolean }
export interface ScanJob {
  id: string; tipo: "descoberta" | "coleta" | "analise"; status: "concluido" | "falhou" | "executando";
  inicio: string; fim: string | null; itens_processados: number; erros: string[]; custo_estimado: number;
}
export interface AuditLog { id: string; user: string; acao: string; entidade: string; entidade_id: string; em: string }
export interface Params { limiar_global: number; retencao_dias: number; frequencia_horas: number; lawyer_score_min: number }

export const REDES: Rede[] = ["instagram", "tiktok", "facebook", "linkedin", "youtube", "x"];
export const STATUS_LABEL: Record<AlertStatus, string> = {
  novo: "Novo", em_analise: "Em análise", confirmado: "Confirmado", falso_positivo: "Falso positivo",
  encaminhado_ted: "Encaminhado ao TED", arquivado: "Arquivado",
};
export const GRAV_LABEL: Record<Gravidade, string> = { alta: "Alta", media: "Média", baixa: "Baixa" };
export const ROLE_LABEL: Record<Role, string> = {
  admin_nacional: "Admin Nacional", admin_seccional: "Admin Seccional", analista: "Analista", leitor: "Leitor",
};
