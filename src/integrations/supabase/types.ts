export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      seccionais: {
        Row: { uf: string; nome: string }
        Insert: { uf: string; nome: string }
        Update: { uf?: string; nome?: string }
        Relationships: []
      }
      user_roles: {
        Row: { id: string; user_id: string; role: string; seccional_uf: string | null; nome: string | null; email: string | null; created_at: string }
        Insert: { id?: string; user_id: string; role: string; seccional_uf?: string | null; nome?: string | null; email?: string | null; created_at?: string }
        Update: { id?: string; user_id?: string; role?: string; seccional_uf?: string | null; nome?: string | null; email?: string | null; created_at?: string }
        Relationships: []
      }
      social_profiles: {
        Row: { id: string; rede: string; username: string; url: string | null; nome_exibido: string | null; bio: string | null; foto_url: string | null; seguidores: number; categoria_perfil: string | null; links_externos: string[]; lawyer_score: number; sinais_identificacao: string[]; uf_provavel: string | null; status_monitoramento: string; ultima_varredura: string | null; risco_score: number; created_at: string }
        Insert: { id?: string; rede: string; username: string; url?: string | null; nome_exibido?: string | null; bio?: string | null; foto_url?: string | null; seguidores?: number; categoria_perfil?: string | null; links_externos?: string[]; lawyer_score?: number; sinais_identificacao?: string[]; uf_provavel?: string | null; status_monitoramento?: string; ultima_varredura?: string | null; risco_score?: number; created_at?: string }
        Update: { id?: string; rede?: string; username?: string; url?: string | null; nome_exibido?: string | null; bio?: string | null; foto_url?: string | null; seguidores?: number; categoria_perfil?: string | null; links_externos?: string[]; lawyer_score?: number; sinais_identificacao?: string[]; uf_provavel?: string | null; status_monitoramento?: string; ultima_varredura?: string | null; risco_score?: number; created_at?: string }
        Relationships: []
      }
      lawyer_data: {
        Row: { profile_id: string; nome_completo: string | null; oab_numero: string | null; oab_uf: string | null; oab_validacao: string; telefones: Json; whatsapp: Json; emails: Json; site: Json | null; endereco: string | null; coletado_em: string }
        Insert: { profile_id: string; nome_completo?: string | null; oab_numero?: string | null; oab_uf?: string | null; oab_validacao?: string; telefones?: Json; whatsapp?: Json; emails?: Json; site?: Json | null; endereco?: string | null; coletado_em?: string }
        Update: { profile_id?: string; nome_completo?: string | null; oab_numero?: string | null; oab_uf?: string | null; oab_validacao?: string; telefones?: Json; whatsapp?: Json; emails?: Json; site?: Json | null; endereco?: string | null; coletado_em?: string }
        Relationships: []
      }
      content_items: {
        Row: { id: string; profile_id: string; tipo: string; url: string | null; texto: string | null; hashtags: string[]; midia_urls: string[]; publicado_em: string | null; coletado_em: string; hash_conteudo: string }
        Insert: { id?: string; profile_id: string; tipo: string; url?: string | null; texto?: string | null; hashtags?: string[]; midia_urls?: string[]; publicado_em?: string | null; coletado_em?: string; hash_conteudo: string }
        Update: { id?: string; profile_id?: string; tipo?: string; url?: string | null; texto?: string | null; hashtags?: string[]; midia_urls?: string[]; publicado_em?: string | null; coletado_em?: string; hash_conteudo?: string }
        Relationships: []
      }
      rules: {
        Row: { id: string; codigo: string; nome: string; descricao: string | null; categoria: string | null; fundamento_normativo: string | null; tipo_deteccao: string; padroes: string[]; exemplos_positivos: string[]; exemplos_negativos: string[]; gravidade: string; peso_score: number; limiar_confianca: number; redes_aplicaveis: string[]; escopo: string; ativo: boolean; versao: number; created_at: string; updated_at: string }
        Insert: { id?: string; codigo: string; nome: string; descricao?: string | null; categoria?: string | null; fundamento_normativo?: string | null; tipo_deteccao?: string; padroes?: string[]; exemplos_positivos?: string[]; exemplos_negativos?: string[]; gravidade: string; peso_score?: number; limiar_confianca?: number; redes_aplicaveis?: string[]; escopo?: string; ativo?: boolean; versao?: number; created_at?: string; updated_at?: string }
        Update: { id?: string; codigo?: string; nome?: string; descricao?: string | null; categoria?: string | null; fundamento_normativo?: string | null; tipo_deteccao?: string; padroes?: string[]; exemplos_positivos?: string[]; exemplos_negativos?: string[]; gravidade?: string; peso_score?: number; limiar_confianca?: number; redes_aplicaveis?: string[]; escopo?: string; ativo?: boolean; versao?: number; created_at?: string; updated_at?: string }
        Relationships: []
      }
      rule_versions: {
        Row: { id: string; rule_id: string; versao: number; autor: string | null; mudanca: string | null; criado_em: string }
        Insert: { id?: string; rule_id: string; versao: number; autor?: string | null; mudanca?: string | null; criado_em?: string }
        Update: { id?: string; rule_id?: string; versao?: number; autor?: string | null; mudanca?: string | null; criado_em?: string }
        Relationships: []
      }
      alerts: {
        Row: { id: string; profile_id: string; content_item_id: string | null; rule_id: string | null; rule_versao: number | null; trecho_detectado: string | null; justificativa_ia: string | null; confianca: number | null; gravidade: string | null; status: string; analista_id: string | null; seccional_uf: string | null; criado_em: string }
        Insert: { id?: string; profile_id: string; content_item_id?: string | null; rule_id?: string | null; rule_versao?: number | null; trecho_detectado?: string | null; justificativa_ia?: string | null; confianca?: number | null; gravidade?: string | null; status?: string; analista_id?: string | null; seccional_uf?: string | null; criado_em?: string }
        Update: { id?: string; profile_id?: string; content_item_id?: string | null; rule_id?: string | null; rule_versao?: number | null; trecho_detectado?: string | null; justificativa_ia?: string | null; confianca?: number | null; gravidade?: string | null; status?: string; analista_id?: string | null; seccional_uf?: string | null; criado_em?: string }
        Relationships: []
      }
      alert_evidence: {
        Row: { id: string; alert_id: string; screenshot_url: string | null; url_original: string | null; texto_capturado: string | null; hash_sha256: string | null; capturado_em: string }
        Insert: { id?: string; alert_id: string; screenshot_url?: string | null; url_original?: string | null; texto_capturado?: string | null; hash_sha256?: string | null; capturado_em?: string }
        Update: { id?: string; alert_id?: string; screenshot_url?: string | null; url_original?: string | null; texto_capturado?: string | null; hash_sha256?: string | null; capturado_em?: string }
        Relationships: []
      }
      alert_events: {
        Row: { id: string; alert_id: string; tipo: string; texto: string | null; autor: string | null; criado_em: string }
        Insert: { id?: string; alert_id: string; tipo: string; texto?: string | null; autor?: string | null; criado_em?: string }
        Update: { id?: string; alert_id?: string; tipo?: string; texto?: string | null; autor?: string | null; criado_em?: string }
        Relationships: []
      }
      discovery_sources: {
        Row: { id: string; tipo: string; valor: string; rede: string | null; ativo: boolean }
        Insert: { id?: string; tipo: string; valor: string; rede?: string | null; ativo?: boolean }
        Update: { id?: string; tipo?: string; valor?: string; rede?: string | null; ativo?: boolean }
        Relationships: []
      }
      scan_jobs: {
        Row: { id: string; tipo: string; status: string; inicio: string; fim: string | null; itens_processados: number; erros: string[]; custo_estimado: number }
        Insert: { id?: string; tipo: string; status?: string; inicio?: string; fim?: string | null; itens_processados?: number; erros?: string[]; custo_estimado?: number }
        Update: { id?: string; tipo?: string; status?: string; inicio?: string; fim?: string | null; itens_processados?: number; erros?: string[]; custo_estimado?: number }
        Relationships: []
      }
      audit_logs: {
        Row: { id: string; user_id: string | null; acao: string; entidade: string | null; entidade_id: string | null; payload: Json | null; criado_em: string }
        Insert: { id?: string; user_id?: string | null; acao: string; entidade?: string | null; entidade_id?: string | null; payload?: Json | null; criado_em?: string }
        Update: { id?: string; user_id?: string | null; acao?: string; entidade?: string | null; entidade_id?: string | null; payload?: Json | null; criado_em?: string }
        Relationships: []
      }
      app_params: {
        Row: { id: number; limiar_global: number; retencao_dias: number; frequencia_horas: number; lawyer_score_min: number; updated_at: string }
        Insert: { id?: number; limiar_global?: number; retencao_dias?: number; frequencia_horas?: number; lawyer_score_min?: number; updated_at?: string }
        Update: { id?: number; limiar_global?: number; retencao_dias?: number; frequencia_horas?: number; lawyer_score_min?: number; updated_at?: string }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
