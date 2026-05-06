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
          parent_comment_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          bake_share_id: string
          comment: string
          created_at?: string
          id?: string
          parent_comment_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          bake_share_id?: string
          comment?: string
          created_at?: string
          id?: string
          parent_comment_id?: string | null
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
            foreignKeyName: "bake_comments_parent_comment_id_fkey"
            columns: ["parent_comment_id"]
            isOneToOne: false
            referencedRelation: "bake_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bake_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bake_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
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
          {
            foreignKeyName: "bake_likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
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
          {
            foreignKeyName: "bake_shares_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
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
      ci_security_status: {
        Row: {
          allowlist_entries: string[]
          build_time: string | null
          checked_at: string
          ci_run_url: string | null
          commit_sha: string | null
          created_at: string
          id: string
          issues: Json
          status: string
          test_files: string[]
        }
        Insert: {
          allowlist_entries?: string[]
          build_time?: string | null
          checked_at?: string
          ci_run_url?: string | null
          commit_sha?: string | null
          created_at?: string
          id?: string
          issues?: Json
          status: string
          test_files?: string[]
        }
        Update: {
          allowlist_entries?: string[]
          build_time?: string | null
          checked_at?: string
          ci_run_url?: string | null
          commit_sha?: string | null
          created_at?: string
          id?: string
          issues?: Json
          status?: string
          test_files?: string[]
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
      content_visibility_settings: {
        Row: {
          content_id: string | null
          content_type: string
          created_at: string
          created_by: string | null
          hidden_from_users: string[] | null
          id: string
          is_visible: boolean
          section_key: string | null
          updated_at: string
          visible_to_roles: Database["public"]["Enums"]["app_role"][] | null
          visible_to_users: string[] | null
        }
        Insert: {
          content_id?: string | null
          content_type: string
          created_at?: string
          created_by?: string | null
          hidden_from_users?: string[] | null
          id?: string
          is_visible?: boolean
          section_key?: string | null
          updated_at?: string
          visible_to_roles?: Database["public"]["Enums"]["app_role"][] | null
          visible_to_users?: string[] | null
        }
        Update: {
          content_id?: string | null
          content_type?: string
          created_at?: string
          created_by?: string | null
          hidden_from_users?: string[] | null
          id?: string
          is_visible?: boolean
          section_key?: string | null
          updated_at?: string
          visible_to_roles?: Database["public"]["Enums"]["app_role"][] | null
          visible_to_users?: string[] | null
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
      feeding_logs: {
        Row: {
          created_at: string
          fed_at: string
          flour_amount_g: number
          flour_type: string
          humidity_percent: number | null
          id: string
          notes: string | null
          peak_hours: number | null
          rise_percentage: number | null
          starter_name: string
          temperature_celsius: number | null
          updated_at: string
          user_id: string
          water_amount_g: number
          water_unit: string
        }
        Insert: {
          created_at?: string
          fed_at?: string
          flour_amount_g?: number
          flour_type?: string
          humidity_percent?: number | null
          id?: string
          notes?: string | null
          peak_hours?: number | null
          rise_percentage?: number | null
          starter_name?: string
          temperature_celsius?: number | null
          updated_at?: string
          user_id: string
          water_amount_g?: number
          water_unit?: string
        }
        Update: {
          created_at?: string
          fed_at?: string
          flour_amount_g?: number
          flour_type?: string
          humidity_percent?: number | null
          id?: string
          notes?: string | null
          peak_hours?: number | null
          rise_percentage?: number | null
          starter_name?: string
          temperature_celsius?: number | null
          updated_at?: string
          user_id?: string
          water_amount_g?: number
          water_unit?: string
        }
        Relationships: []
      }
      followers: {
        Row: {
          created_at: string
          follower_id: string
          following_id: string
          id: string
        }
        Insert: {
          created_at?: string
          follower_id: string
          following_id: string
          id?: string
        }
        Update: {
          created_at?: string
          follower_id?: string
          following_id?: string
          id?: string
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
          achievement_alerts: boolean | null
          bake_reminders: boolean | null
          community_reports: boolean
          created_at: string
          id: string
          new_messages: boolean
          push_enabled: boolean | null
          security_alerts: boolean
          status_updates: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          achievement_alerts?: boolean | null
          bake_reminders?: boolean | null
          community_reports?: boolean
          created_at?: string
          id?: string
          new_messages?: boolean
          push_enabled?: boolean | null
          security_alerts?: boolean
          status_updates?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          achievement_alerts?: boolean | null
          bake_reminders?: boolean | null
          community_reports?: boolean
          created_at?: string
          id?: string
          new_messages?: boolean
          push_enabled?: boolean | null
          security_alerts?: boolean
          status_updates?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          actor_id: string | null
          content_id: string | null
          created_at: string
          id: string
          is_read: boolean
          message: string
          type: string
          user_id: string
        }
        Insert: {
          actor_id?: string | null
          content_id?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          type: string
          user_id: string
        }
        Update: {
          actor_id?: string | null
          content_id?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          type?: string
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
          avatar_url: string | null
          baking_since: string | null
          bio: string | null
          country: string | null
          cover_image_url: string | null
          created_at: string
          email: string
          favorite_bread_type: string | null
          id: string
          is_public: boolean
          name: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          baking_since?: string | null
          bio?: string | null
          country?: string | null
          cover_image_url?: string | null
          created_at?: string
          email: string
          favorite_bread_type?: string | null
          id: string
          is_public?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          baking_since?: string | null
          bio?: string | null
          country?: string | null
          cover_image_url?: string | null
          created_at?: string
          email?: string
          favorite_bread_type?: string | null
          id?: string
          is_public?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          updated_at: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          updated_at?: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          updated_at?: string
          user_id?: string
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
      role_permissions: {
        Row: {
          created_at: string
          id: string
          permission: Database["public"]["Enums"]["app_permission"]
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          created_at?: string
          id?: string
          permission: Database["public"]["Enums"]["app_permission"]
          role: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          created_at?: string
          id?: string
          permission?: Database["public"]["Enums"]["app_permission"]
          role?: Database["public"]["Enums"]["app_role"]
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
      user_permissions: {
        Row: {
          created_at: string
          granted: boolean
          granted_by: string | null
          id: string
          permission: Database["public"]["Enums"]["app_permission"]
          user_id: string
        }
        Insert: {
          created_at?: string
          granted?: boolean
          granted_by?: string | null
          id?: string
          permission: Database["public"]["Enums"]["app_permission"]
          user_id: string
        }
        Update: {
          created_at?: string
          granted?: boolean
          granted_by?: string | null
          id?: string
          permission?: Database["public"]["Enums"]["app_permission"]
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
      customer_messages_safe: {
        Row: {
          category: string | null
          created_at: string | null
          email: string | null
          id: string | null
          message: string | null
          status: string | null
          subject: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          email?: never
          id?: string | null
          message?: string | null
          status?: string | null
          subject?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          email?: never
          id?: string | null
          message?: string | null
          status?: string | null
          subject?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      public_profiles: {
        Row: {
          avatar_url: string | null
          baking_since: string | null
          bio: string | null
          country: string | null
          cover_image_url: string | null
          created_at: string | null
          favorite_bread_type: string | null
          id: string | null
          is_public: boolean | null
          name: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          baking_since?: string | null
          bio?: string | null
          country?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          favorite_bread_type?: string | null
          id?: string | null
          is_public?: boolean | null
          name?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          baking_since?: string | null
          bio?: string | null
          country?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          favorite_bread_type?: string | null
          id?: string | null
          is_public?: boolean | null
          name?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      push_subscriptions_safe: {
        Row: {
          created_at: string | null
          endpoint: string | null
          id: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          endpoint?: string | null
          id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          endpoint?: string | null
          id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
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
      webhook_configs_safe: {
        Row: {
          created_at: string | null
          id: string | null
          is_enabled: boolean | null
          outgoing_url: string | null
          retry_count: number | null
          secret_key_masked: string | null
          subscribed_events: string[] | null
          timeout_seconds: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string | null
          is_enabled?: boolean | null
          outgoing_url?: string | null
          retry_count?: number | null
          secret_key_masked?: never
          subscribed_events?: string[] | null
          timeout_seconds?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string | null
          is_enabled?: boolean | null
          outgoing_url?: string | null
          retry_count?: number | null
          secret_key_masked?: never
          subscribed_events?: string[] | null
          timeout_seconds?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      cleanup_expired_blocks: { Args: never; Returns: undefined }
      cleanup_old_audit_logs: { Args: never; Returns: undefined }
      cleanup_old_rate_limits: { Args: never; Returns: undefined }
      get_my_role_permissions: {
        Args: never
        Returns: {
          permission: Database["public"]["Enums"]["app_permission"]
        }[]
      }
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
      has_permission: {
        Args: {
          _permission: Database["public"]["Enums"]["app_permission"]
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
      log_ci_gate_resolution: {
        Args: {
          _action: string
          _details?: Json
          _issue_kind: string
          _issue_label: string
          _path: string
        }
        Returns: undefined
      }
      log_moderation_action: {
        Args: {
          _action: string
          _content_id: string
          _content_type: string
          _details?: Json
        }
        Returns: undefined
      }
      log_security_doc_view: { Args: never; Returns: undefined }
      log_security_step_up: { Args: never; Returns: undefined }
      regenerate_webhook_secret: {
        Args: { _config_id: string }
        Returns: string
      }
      verify_webhook_secret: {
        Args: { _config_id: string; _provided_secret: string }
        Returns: boolean
      }
    }
    Enums: {
      app_permission:
        | "can_view_analytics"
        | "can_export_data"
        | "can_manage_users"
        | "can_manage_content"
        | "can_view_audit_logs"
        | "can_manage_security"
        | "can_respond_messages"
        | "can_delete_messages"
        | "can_manage_tutorials"
        | "can_manage_premixes"
        | "can_manage_goals"
        | "can_manage_visibility"
        | "can_export_security_summary"
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
      app_permission: [
        "can_view_analytics",
        "can_export_data",
        "can_manage_users",
        "can_manage_content",
        "can_view_audit_logs",
        "can_manage_security",
        "can_respond_messages",
        "can_delete_messages",
        "can_manage_tutorials",
        "can_manage_premixes",
        "can_manage_goals",
        "can_manage_visibility",
        "can_export_security_summary",
      ],
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
