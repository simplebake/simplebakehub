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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      app_settings: {
        Row: {
          created_at: string
          id: string
          setting_key: string
          setting_value: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          setting_key: string
          setting_value?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          setting_key?: string
          setting_value?: Json
          updated_at?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          created_at: string
          details: Json | null
          endpoint: string | null
          event_type: string
          id: string
          ip_address: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          details?: Json | null
          endpoint?: string | null
          event_type: string
          id?: string
          ip_address?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          details?: Json | null
          endpoint?: string | null
          event_type?: string
          id?: string
          ip_address?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      bake_comments: {
        Row: {
          bake_share_id: string
          comment: string
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          bake_share_id: string
          comment: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          bake_share_id?: string
          comment?: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bake_comments_bake_share_id_fkey"
            columns: ["bake_share_id"]
            isOneToOne: false
            referencedRelation: "bake_shares"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bake_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      bake_likes: {
        Row: {
          bake_share_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          bake_share_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          bake_share_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bake_likes_bake_share_id_fkey"
            columns: ["bake_share_id"]
            isOneToOne: false
            referencedRelation: "bake_shares"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bake_likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      bake_shares: {
        Row: {
          created_at: string
          description: string | null
          id: string
          image_url: string
          is_visible: boolean
          premix_id: string
          rating: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          image_url: string
          is_visible?: boolean
          premix_id: string
          rating?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string
          is_visible?: boolean
          premix_id?: string
          rating?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bake_shares_premix_id_fkey"
            columns: ["premix_id"]
            isOneToOne: false
            referencedRelation: "premixes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bake_shares_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      baking_sessions: {
        Row: {
          altitude_meters: number | null
          baking_temp_adjustment_celsius: number | null
          completed_at: string | null
          created_at: string
          humidity_percent: number | null
          id: string
          issues: string[] | null
          mixing_method: string | null
          oil_adjustment_ml: number | null
          outcome_notes: string | null
          oven_type: string | null
          premix_id: string
          proofing_time_adjustment_minutes: number | null
          season: string | null
          success_rating: number | null
          temperature_celsius: number | null
          user_id: string
          water_adjustment_ml: number | null
        }
        Insert: {
          altitude_meters?: number | null
          baking_temp_adjustment_celsius?: number | null
          completed_at?: string | null
          created_at?: string
          humidity_percent?: number | null
          id?: string
          issues?: string[] | null
          mixing_method?: string | null
          oil_adjustment_ml?: number | null
          outcome_notes?: string | null
          oven_type?: string | null
          premix_id: string
          proofing_time_adjustment_minutes?: number | null
          season?: string | null
          success_rating?: number | null
          temperature_celsius?: number | null
          user_id: string
          water_adjustment_ml?: number | null
        }
        Update: {
          altitude_meters?: number | null
          baking_temp_adjustment_celsius?: number | null
          completed_at?: string | null
          created_at?: string
          humidity_percent?: number | null
          id?: string
          issues?: string[] | null
          mixing_method?: string | null
          oil_adjustment_ml?: number | null
          outcome_notes?: string | null
          oven_type?: string | null
          premix_id?: string
          proofing_time_adjustment_minutes?: number | null
          season?: string | null
          success_rating?: number | null
          temperature_celsius?: number | null
          user_id?: string
          water_adjustment_ml?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "baking_sessions_premix_id_fkey"
            columns: ["premix_id"]
            isOneToOne: false
            referencedRelation: "premixes"
            referencedColumns: ["id"]
          },
        ]
      }
      blocked_ips: {
        Row: {
          auto_blocked: boolean
          blocked_at: string
          blocked_by: string | null
          created_at: string
          expires_at: string | null
          id: string
          ip_address: string
          is_active: boolean
          reason: string
          violation_count: number
        }
        Insert: {
          auto_blocked?: boolean
          blocked_at?: string
          blocked_by?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          ip_address: string
          is_active?: boolean
          reason: string
          violation_count?: number
        }
        Update: {
          auto_blocked?: boolean
          blocked_at?: string
          blocked_by?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          ip_address?: string
          is_active?: boolean
          reason?: string
          violation_count?: number
        }
        Relationships: []
      }
      campaigns: {
        Row: {
          channel: string
          created_at: string
          end_date: string
          id: string
          kpi: string
          name: string
          start_date: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          channel: string
          created_at?: string
          end_date: string
          id?: string
          kpi: string
          name: string
          start_date: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          channel?: string
          created_at?: string
          end_date?: string
          id?: string
          kpi?: string
          name?: string
          start_date?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      content_ideas: {
        Row: {
          channel: string
          created_at: string
          id: string
          next_action: string
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          channel: string
          created_at?: string
          id?: string
          next_action: string
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          channel?: string
          created_at?: string
          id?: string
          next_action?: string
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      content_reports: {
        Row: {
          content_id: string
          content_type: string
          created_at: string
          description: string | null
          id: string
          reason: string
          reporter_id: string
          resolution_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          content_id: string
          content_type: string
          created_at?: string
          description?: string | null
          id?: string
          reason: string
          reporter_id: string
          resolution_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          content_id?: string
          content_type?: string
          created_at?: string
          description?: string | null
          id?: string
          reason?: string
          reporter_id?: string
          resolution_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      conversations: {
        Row: {
          created_at: string | null
          id: string
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          title?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      customer_messages: {
        Row: {
          category: string
          created_at: string
          email: string | null
          id: string
          message: string
          status: string
          subject: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          category: string
          created_at?: string
          email?: string | null
          id?: string
          message: string
          status?: string
          subject: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          email?: string | null
          id?: string
          message?: string
          status?: string
          subject?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string | null
          id: string
          role: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string | null
          id?: string
          role: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string | null
          id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          community_reports: boolean
          created_at: string
          id: string
          new_messages: boolean
          security_alerts: boolean
          status_updates: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          community_reports?: boolean
          created_at?: string
          id?: string
          new_messages?: boolean
          security_alerts?: boolean
          status_updates?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          community_reports?: boolean
          created_at?: string
          id?: string
          new_messages?: boolean
          security_alerts?: boolean
          status_updates?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      performance_goal_history: {
        Row: {
          created_at: string
          goal_id: string
          id: string
          recorded_at: string
          recorded_value: number
        }
        Insert: {
          created_at?: string
          goal_id: string
          id?: string
          recorded_at?: string
          recorded_value: number
        }
        Update: {
          created_at?: string
          goal_id?: string
          id?: string
          recorded_at?: string
          recorded_value?: number
        }
        Relationships: [
          {
            foreignKeyName: "performance_goal_history_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "performance_goals"
            referencedColumns: ["id"]
          },
        ]
      }
      performance_goals: {
        Row: {
          created_at: string
          created_by: string | null
          current_value: number | null
          end_date: string | null
          goal_name: string
          goal_type: string
          id: string
          is_active: boolean
          period: string
          start_date: string
          target_value: number
          unit: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          current_value?: number | null
          end_date?: string | null
          goal_name: string
          goal_type: string
          id?: string
          is_active?: boolean
          period?: string
          start_date?: string
          target_value: number
          unit?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          current_value?: number | null
          end_date?: string | null
          goal_name?: string
          goal_type?: string
          id?: string
          is_active?: boolean
          period?: string
          start_date?: string
          target_value?: number
          unit?: string
          updated_at?: string
        }
        Relationships: []
      }
      premix_steps: {
        Row: {
          content: string
          created_at: string
          id: string
          premix_id: string
          step_number: number
          title: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          premix_id: string
          step_number: number
          title: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          premix_id?: string
          step_number?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "premix_steps_premix_id_fkey"
            columns: ["premix_id"]
            isOneToOne: false
            referencedRelation: "premixes"
            referencedColumns: ["id"]
          },
        ]
      }
      premixes: {
        Row: {
          created_at: string
          description: string
          difficulty: string
          id: string
          image_url: string | null
          name: string
          oil_amount: string
          optional_extras: string[] | null
          updated_at: string
          water_amount: number
        }
        Insert: {
          created_at?: string
          description: string
          difficulty: string
          id?: string
          image_url?: string | null
          name: string
          oil_amount: string
          optional_extras?: string[] | null
          updated_at?: string
          water_amount: number
        }
        Update: {
          created_at?: string
          description?: string
          difficulty?: string
          id?: string
          image_url?: string | null
          name?: string
          oil_amount?: string
          optional_extras?: string[] | null
          updated_at?: string
          water_amount?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          country: string | null
          created_at: string
          email: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          country?: string | null
          created_at?: string
          email: string
          id: string
          name: string
          updated_at?: string
        }
        Update: {
          country?: string | null
          created_at?: string
          email?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      rate_limits: {
        Row: {
          created_at: string
          endpoint: string
          id: string
          ip_address: string
          request_count: number
          window_start: string
        }
        Insert: {
          created_at?: string
          endpoint: string
          id?: string
          ip_address: string
          request_count?: number
          window_start?: string
        }
        Update: {
          created_at?: string
          endpoint?: string
          id?: string
          ip_address?: string
          request_count?: number
          window_start?: string
        }
        Relationships: []
      }
      tutorials: {
        Row: {
          category: string
          content: string
          created_at: string
          id: string
          tags: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          category: string
          content: string
          created_at?: string
          id?: string
          tags?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          content?: string
          created_at?: string
          id?: string
          tags?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_achievements: {
        Row: {
          badge_description: string
          badge_icon: string
          badge_name: string
          badge_type: Database["public"]["Enums"]["badge_type"]
          created_at: string
          earned_at: string
          id: string
          user_id: string
        }
        Insert: {
          badge_description: string
          badge_icon: string
          badge_name: string
          badge_type: Database["public"]["Enums"]["badge_type"]
          created_at?: string
          earned_at?: string
          id?: string
          user_id: string
        }
        Update: {
          badge_description?: string
          badge_icon?: string
          badge_name?: string
          badge_type?: Database["public"]["Enums"]["badge_type"]
          created_at?: string
          earned_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          created_at: string | null
          id: string
          preferences: Json | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          preferences?: Json | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          preferences?: Json | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      webhook_configs: {
        Row: {
          created_at: string
          id: string
          is_enabled: boolean
          outgoing_url: string | null
          retry_count: number
          secret_key: string
          subscribed_events: string[] | null
          timeout_seconds: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_enabled?: boolean
          outgoing_url?: string | null
          retry_count?: number
          secret_key: string
          subscribed_events?: string[] | null
          timeout_seconds?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_enabled?: boolean
          outgoing_url?: string | null
          retry_count?: number
          secret_key?: string
          subscribed_events?: string[] | null
          timeout_seconds?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      webhook_logs: {
        Row: {
          created_at: string
          direction: string
          duration_ms: number | null
          endpoint_url: string
          error_message: string | null
          id: string
          integration_id: string
          method: string
          request_headers: Json | null
          request_payload: Json | null
          response_body: Json | null
          response_status: number | null
          success: boolean
        }
        Insert: {
          created_at?: string
          direction: string
          duration_ms?: number | null
          endpoint_url: string
          error_message?: string | null
          id?: string
          integration_id: string
          method?: string
          request_headers?: Json | null
          request_payload?: Json | null
          response_body?: Json | null
          response_status?: number | null
          success?: boolean
        }
        Update: {
          created_at?: string
          direction?: string
          duration_ms?: number | null
          endpoint_url?: string
          error_message?: string | null
          id?: string
          integration_id?: string
          method?: string
          request_headers?: Json | null
          request_payload?: Json | null
          response_body?: Json | null
          response_status?: number | null
          success?: boolean
        }
        Relationships: []
      }
    }
    Views: {
      rate_limit_violations: {
        Row: {
          endpoint: string | null
          ip_address: string | null
          last_violation: string | null
          max_requests: number | null
          violation_count: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      cleanup_expired_blocks: { Args: never; Returns: undefined }
      cleanup_old_audit_logs: { Args: never; Returns: undefined }
      cleanup_old_rate_limits: { Args: never; Returns: undefined }
      get_rate_limit_violations_admin: {
        Args: never
        Returns: {
          endpoint: string
          ip_address: string
          last_violation: string
          max_requests: number
          violation_count: number
        }[]
      }
      get_rate_limit_violations_secure: {
        Args: never
        Returns: {
          endpoint: string
          ip_address: string
          last_violation: string
          max_requests: number
          violation_count: number
        }[]
      }
      has_any_role: {
        Args: {
          _roles: Database["public"]["Enums"]["app_role"][]
          _user_id: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user" | "moderator" | "support"
      badge_type:
        | "first_bake"
        | "basics_master"
        | "technique_explorer"
        | "troubleshooting_pro"
        | "rising_star"
        | "gluten_free_champion"
        | "learning_pioneer"
        | "consistency_king"
        | "advanced_baker"
        | "community_contributor"
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
      app_role: ["admin", "user", "moderator", "support"],
      badge_type: [
        "first_bake",
        "basics_master",
        "technique_explorer",
        "troubleshooting_pro",
        "rising_star",
        "gluten_free_champion",
        "learning_pioneer",
        "consistency_king",
        "advanced_baker",
        "community_contributor",
      ],
    },
  },
} as const
