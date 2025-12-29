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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      entregadores: {
        Row: {
          ativo: boolean
          created_at: string
          dias_trabalho: Json | null
          fila_posicao: string | null
          franquia_id: string | null
          hora_saida: string | null
          id: string
          nome: string
          status: string
          telefone: string
          tipo_bag: string | null
          turno_fim: string | null
          turno_inicio: string | null
          unidade: string
          unidade_id: string | null
          updated_at: string
          usar_turno_padrao: boolean | null
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          dias_trabalho?: Json | null
          fila_posicao?: string | null
          franquia_id?: string | null
          hora_saida?: string | null
          id?: string
          nome: string
          status?: string
          telefone: string
          tipo_bag?: string | null
          turno_fim?: string | null
          turno_inicio?: string | null
          unidade: string
          unidade_id?: string | null
          updated_at?: string
          usar_turno_padrao?: boolean | null
        }
        Update: {
          ativo?: boolean
          created_at?: string
          dias_trabalho?: Json | null
          fila_posicao?: string | null
          franquia_id?: string | null
          hora_saida?: string | null
          id?: string
          nome?: string
          status?: string
          telefone?: string
          tipo_bag?: string | null
          turno_fim?: string | null
          turno_inicio?: string | null
          unidade?: string
          unidade_id?: string | null
          updated_at?: string
          usar_turno_padrao?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "entregadores_franquia_id_fkey"
            columns: ["franquia_id"]
            isOneToOne: false
            referencedRelation: "franquias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entregadores_unidade_id_fkey"
            columns: ["unidade_id"]
            isOneToOne: false
            referencedRelation: "unidades"
            referencedColumns: ["id"]
          },
        ]
      }
      franquia_bag_tipos: {
        Row: {
          ativo: boolean
          created_at: string
          descricao: string | null
          franquia_id: string
          id: string
          nome: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          franquia_id: string
          id?: string
          nome: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          franquia_id?: string
          id?: string
          nome?: string
        }
        Relationships: [
          {
            foreignKeyName: "franquia_bag_tipos_franquia_id_fkey"
            columns: ["franquia_id"]
            isOneToOne: false
            referencedRelation: "franquias"
            referencedColumns: ["id"]
          },
        ]
      }
      franquia_cobrancas: {
        Row: {
          created_at: string
          external_id: string
          franquia_id: string
          gateway: string
          id: string
          payload: Json | null
          status: string
          updated_at: string
          valor: number
          vencimento: string | null
        }
        Insert: {
          created_at?: string
          external_id: string
          franquia_id: string
          gateway: string
          id?: string
          payload?: Json | null
          status: string
          updated_at?: string
          valor: number
          vencimento?: string | null
        }
        Update: {
          created_at?: string
          external_id?: string
          franquia_id?: string
          gateway?: string
          id?: string
          payload?: Json | null
          status?: string
          updated_at?: string
          valor?: number
          vencimento?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "franquia_cobrancas_franquia_id_fkey"
            columns: ["franquia_id"]
            isOneToOne: false
            referencedRelation: "franquias"
            referencedColumns: ["id"]
          },
        ]
      }
      franquias: {
        Row: {
          config_pagamento: Json | null
          created_at: string | null
          data_vencimento: string | null
          horario_reset: string | null
          id: string
          nome_franquia: string
          plano_limite_lojas: number | null
          slug: string
          status_pagamento: string | null
        }
        Insert: {
          config_pagamento?: Json | null
          created_at?: string | null
          data_vencimento?: string | null
          horario_reset?: string | null
          id?: string
          nome_franquia: string
          plano_limite_lojas?: number | null
          slug: string
          status_pagamento?: string | null
        }
        Update: {
          config_pagamento?: Json | null
          created_at?: string | null
          data_vencimento?: string | null
          horario_reset?: string | null
          id?: string
          nome_franquia?: string
          plano_limite_lojas?: number | null
          slug?: string
          status_pagamento?: string | null
        }
        Relationships: []
      }
      global_config: {
        Row: {
          config_key: string
          config_value: string
          created_at: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          config_key: string
          config_value: string
          created_at?: string | null
          id?: string
          updated_at?: string | null
        }
        Update: {
          config_key?: string
          config_value?: string
          created_at?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      historico_entregas: {
        Row: {
          created_at: string
          entregador_id: string
          franquia_id: string | null
          hora_retorno: string | null
          hora_saida: string
          id: string
          tipo_bag: string | null
          unidade: string
          unidade_id: string | null
        }
        Insert: {
          created_at?: string
          entregador_id: string
          franquia_id?: string | null
          hora_retorno?: string | null
          hora_saida?: string
          id?: string
          tipo_bag?: string | null
          unidade: string
          unidade_id?: string | null
        }
        Update: {
          created_at?: string
          entregador_id?: string
          franquia_id?: string | null
          hora_retorno?: string | null
          hora_saida?: string
          id?: string
          tipo_bag?: string | null
          unidade?: string
          unidade_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "historico_entregas_entregador_id_fkey"
            columns: ["entregador_id"]
            isOneToOne: false
            referencedRelation: "entregadores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historico_entregas_franquia_id_fkey"
            columns: ["franquia_id"]
            isOneToOne: false
            referencedRelation: "franquias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historico_entregas_unidade_id_fkey"
            columns: ["unidade_id"]
            isOneToOne: false
            referencedRelation: "unidades"
            referencedColumns: ["id"]
          },
        ]
      }
      logs_auditoria: {
        Row: {
          acao: string | null
          created_at: string | null
          detalhes: Json | null
          franquia_id: string | null
          id: string
          usuario_email: string | null
        }
        Insert: {
          acao?: string | null
          created_at?: string | null
          detalhes?: Json | null
          franquia_id?: string | null
          id?: string
          usuario_email?: string | null
        }
        Update: {
          acao?: string | null
          created_at?: string | null
          detalhes?: Json | null
          franquia_id?: string | null
          id?: string
          usuario_email?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "logs_auditoria_franquia_id_fkey"
            columns: ["franquia_id"]
            isOneToOne: false
            referencedRelation: "franquias"
            referencedColumns: ["id"]
          },
        ]
      }
      modulos: {
        Row: {
          ativo: boolean | null
          codigo: string
          created_at: string | null
          descricao: string | null
          id: string
          nome: string
          preco_mensal: number | null
        }
        Insert: {
          ativo?: boolean | null
          codigo: string
          created_at?: string | null
          descricao?: string | null
          id?: string
          nome: string
          preco_mensal?: number | null
        }
        Update: {
          ativo?: boolean | null
          codigo?: string
          created_at?: string | null
          descricao?: string | null
          id?: string
          nome?: string
          preco_mensal?: number | null
        }
        Relationships: []
      }
      pacotes_comerciais: {
        Row: {
          ativo: boolean | null
          codigo: string
          created_at: string | null
          desconto_percent: number | null
          descricao: string | null
          id: string
          modulos_inclusos: Json | null
          nome: string
          plano_id: string | null
          preco_total: number
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          codigo: string
          created_at?: string | null
          desconto_percent?: number | null
          descricao?: string | null
          id?: string
          modulos_inclusos?: Json | null
          nome: string
          plano_id?: string | null
          preco_total: number
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          codigo?: string
          created_at?: string | null
          desconto_percent?: number | null
          descricao?: string | null
          id?: string
          modulos_inclusos?: Json | null
          nome?: string
          plano_id?: string | null
          preco_total?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pacotes_comerciais_plano_id_fkey"
            columns: ["plano_id"]
            isOneToOne: false
            referencedRelation: "planos"
            referencedColumns: ["id"]
          },
        ]
      }
      planos: {
        Row: {
          ativo: boolean
          created_at: string
          descricao: string | null
          dias_trial: number | null
          duracao_meses: number
          forma_cobranca: string | null
          id: string
          nome: string
          permite_trial: boolean | null
          tipo: string
          valor_base: number
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          dias_trial?: number | null
          duracao_meses?: number
          forma_cobranca?: string | null
          id?: string
          nome: string
          permite_trial?: boolean | null
          tipo: string
          valor_base: number
        }
        Update: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          dias_trial?: number | null
          duracao_meses?: number
          forma_cobranca?: string | null
          id?: string
          nome?: string
          permite_trial?: boolean | null
          tipo?: string
          valor_base?: number
        }
        Relationships: []
      }
      senhas_pagamento: {
        Row: {
          atendido_em: string | null
          chamado_em: string | null
          created_at: string | null
          entregador_id: string | null
          entregador_nome: string | null
          expira_em: string
          franquia_id: string
          id: string
          numero_senha: string
          status: string | null
          unidade_id: string
          updated_at: string | null
        }
        Insert: {
          atendido_em?: string | null
          chamado_em?: string | null
          created_at?: string | null
          entregador_id?: string | null
          entregador_nome?: string | null
          expira_em?: string
          franquia_id: string
          id?: string
          numero_senha: string
          status?: string | null
          unidade_id: string
          updated_at?: string | null
        }
        Update: {
          atendido_em?: string | null
          chamado_em?: string | null
          created_at?: string | null
          entregador_id?: string | null
          entregador_nome?: string | null
          expira_em?: string
          franquia_id?: string
          id?: string
          numero_senha?: string
          status?: string | null
          unidade_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "senhas_pagamento_entregador_id_fkey"
            columns: ["entregador_id"]
            isOneToOne: false
            referencedRelation: "entregadores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "senhas_pagamento_franquia_id_fkey"
            columns: ["franquia_id"]
            isOneToOne: false
            referencedRelation: "franquias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "senhas_pagamento_unidade_id_fkey"
            columns: ["unidade_id"]
            isOneToOne: false
            referencedRelation: "unidades"
            referencedColumns: ["id"]
          },
        ]
      }
      system_config: {
        Row: {
          created_at: string | null
          id: string
          nome_loja: string | null
          unidade: string
          updated_at: string | null
          webhook_url: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          nome_loja?: string | null
          unidade: string
          updated_at?: string | null
          webhook_url?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          nome_loja?: string | null
          unidade?: string
          updated_at?: string | null
          webhook_url?: string | null
        }
        Relationships: []
      }
      system_users: {
        Row: {
          created_at: string | null
          franquia_id: string | null
          id: string
          password_hash: string
          role: Database["public"]["Enums"]["app_role"]
          unidade: string
          unidade_id: string | null
          updated_at: string | null
          username: string
        }
        Insert: {
          created_at?: string | null
          franquia_id?: string | null
          id?: string
          password_hash: string
          role?: Database["public"]["Enums"]["app_role"]
          unidade?: string
          unidade_id?: string | null
          updated_at?: string | null
          username: string
        }
        Update: {
          created_at?: string | null
          franquia_id?: string | null
          id?: string
          password_hash?: string
          role?: Database["public"]["Enums"]["app_role"]
          unidade?: string
          unidade_id?: string | null
          updated_at?: string | null
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "system_users_franquia_id_fkey"
            columns: ["franquia_id"]
            isOneToOne: false
            referencedRelation: "franquias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "system_users_unidade_id_fkey"
            columns: ["unidade_id"]
            isOneToOne: false
            referencedRelation: "unidades"
            referencedColumns: ["id"]
          },
        ]
      }
      unidade_bag_tipos: {
        Row: {
          ativo: boolean
          bag_tipo_id: string
          created_at: string
          id: string
          unidade_id: string
        }
        Insert: {
          ativo?: boolean
          bag_tipo_id: string
          created_at?: string
          id?: string
          unidade_id: string
        }
        Update: {
          ativo?: boolean
          bag_tipo_id?: string
          created_at?: string
          id?: string
          unidade_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "unidade_bag_tipos_bag_tipo_id_fkey"
            columns: ["bag_tipo_id"]
            isOneToOne: false
            referencedRelation: "franquia_bag_tipos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unidade_bag_tipos_unidade_id_fkey"
            columns: ["unidade_id"]
            isOneToOne: false
            referencedRelation: "unidades"
            referencedColumns: ["id"]
          },
        ]
      }
      unidade_modulos: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          data_ativacao: string | null
          data_expiracao: string | null
          id: string
          modulo_codigo: string
          unidade_id: string
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          data_ativacao?: string | null
          data_expiracao?: string | null
          id?: string
          modulo_codigo: string
          unidade_id: string
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          data_ativacao?: string | null
          data_expiracao?: string | null
          id?: string
          modulo_codigo?: string
          unidade_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "unidade_modulos_unidade_id_fkey"
            columns: ["unidade_id"]
            isOneToOne: false
            referencedRelation: "unidades"
            referencedColumns: ["id"]
          },
        ]
      }
      unidade_planos: {
        Row: {
          ativo: boolean
          created_at: string
          desconto_percent: number
          id: string
          plano_id: string
          unidade_id: string
          valor: number
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          desconto_percent?: number
          id?: string
          plano_id: string
          unidade_id: string
          valor: number
        }
        Update: {
          ativo?: boolean
          created_at?: string
          desconto_percent?: number
          id?: string
          plano_id?: string
          unidade_id?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "unidade_planos_plano_id_fkey"
            columns: ["plano_id"]
            isOneToOne: false
            referencedRelation: "planos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unidade_planos_unidade_id_fkey"
            columns: ["unidade_id"]
            isOneToOne: false
            referencedRelation: "unidades"
            referencedColumns: ["id"]
          },
        ]
      }
      unidades: {
        Row: {
          config_sheets_url: string | null
          config_whatsapp: Json | null
          created_at: string | null
          franquia_id: string
          id: string
          nome_loja: string
        }
        Insert: {
          config_sheets_url?: string | null
          config_whatsapp?: Json | null
          created_at?: string | null
          franquia_id: string
          id?: string
          nome_loja: string
        }
        Update: {
          config_sheets_url?: string | null
          config_whatsapp?: Json | null
          created_at?: string | null
          franquia_id?: string
          id?: string
          nome_loja?: string
        }
        Relationships: [
          {
            foreignKeyName: "unidades_franquia_id_fkey"
            columns: ["franquia_id"]
            isOneToOne: false
            referencedRelation: "franquias"
            referencedColumns: ["id"]
          },
        ]
      }
      user_unidades: {
        Row: {
          created_at: string
          id: string
          unidade_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          unidade_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          unidade_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_unidades_unidade_id_fkey"
            columns: ["unidade_id"]
            isOneToOne: false
            referencedRelation: "unidades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_unidades_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "system_users"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_historico: {
        Row: {
          created_at: string | null
          entregador_id: string | null
          enviado_em: string | null
          id: string
          mensagem: string
          telefone: string
          tipo: string | null
          unidade_id: string
        }
        Insert: {
          created_at?: string | null
          entregador_id?: string | null
          enviado_em?: string | null
          id?: string
          mensagem: string
          telefone: string
          tipo?: string | null
          unidade_id: string
        }
        Update: {
          created_at?: string | null
          entregador_id?: string | null
          enviado_em?: string | null
          id?: string
          mensagem?: string
          telefone?: string
          tipo?: string | null
          unidade_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_historico_entregador_id_fkey"
            columns: ["entregador_id"]
            isOneToOne: false
            referencedRelation: "entregadores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_historico_unidade_id_fkey"
            columns: ["unidade_id"]
            isOneToOne: false
            referencedRelation: "unidades"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_templates: {
        Row: {
          ativo: boolean | null
          codigo: string
          created_at: string | null
          id: string
          mensagem: string
          titulo: string
          unidade_id: string
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          codigo: string
          created_at?: string | null
          id?: string
          mensagem: string
          titulo: string
          unidade_id: string
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          codigo?: string
          created_at?: string | null
          id?: string
          mensagem?: string
          titulo?: string
          unidade_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_templates_unidade_id_fkey"
            columns: ["unidade_id"]
            isOneToOne: false
            referencedRelation: "unidades"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      app_role: "admin" | "user"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user"],
    },
  },
} as const
