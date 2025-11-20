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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
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
