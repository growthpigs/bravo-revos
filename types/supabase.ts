/**
 * Supabase Database Types (Minimal)
 *
 * These types are manually defined for the tables used in tests.
 * For full type generation, run:
 *   npx supabase gen types typescript --project-id kvjcidxbyimoswntpjcp > types/supabase.ts
 *
 * Note: This requires Supabase CLI authentication via `npx supabase login`
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      scrape_jobs: {
        Row: {
          id: string
          campaign_id: string
          post_id: string
          unipile_post_id: string
          unipile_account_id: string
          trigger_word: string
          status: string
          poll_interval_minutes: number
          next_check: string
          comments_scanned: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          campaign_id: string
          post_id: string
          unipile_post_id: string
          unipile_account_id: string
          trigger_word: string
          status: string
          poll_interval_minutes: number
          next_check: string
          comments_scanned?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          campaign_id?: string
          post_id?: string
          unipile_post_id?: string
          unipile_account_id?: string
          trigger_word?: string
          status?: string
          poll_interval_minutes?: number
          next_check?: string
          comments_scanned?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          type: string
          post_id: string
          linkedin_url: string
          status: string
          sent_at: string | null
          error_message: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: string
          post_id: string
          linkedin_url: string
          status: string
          sent_at?: string | null
          error_message?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          type?: string
          post_id?: string
          linkedin_url?: string
          status?: string
          sent_at?: string | null
          error_message?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      brand_cartridges: {
        Row: {
          id: string
          user_id: string
          name: string
          company_name: string | null
          company_description: string | null
          company_tagline: string | null
          industry: string | null
          target_audience: string | null
          core_values: string[] | null
          brand_voice: string | null
          brand_personality: string[] | null
          logo_url: string | null
          brand_colors: Json | null
          social_links: Json | null
          created_at: string
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          company_name?: string | null
          company_description?: string | null
          company_tagline?: string | null
          industry?: string | null
          target_audience?: string | null
          core_values?: string[] | null
          brand_voice?: string | null
          brand_personality?: string[] | null
          logo_url?: string | null
          brand_colors?: Json | null
          social_links?: Json | null
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          company_name?: string | null
          company_description?: string | null
          company_tagline?: string | null
          industry?: string | null
          target_audience?: string | null
          core_values?: string[] | null
          brand_voice?: string | null
          brand_personality?: string[] | null
          logo_url?: string | null
          brand_colors?: Json | null
          social_links?: Json | null
          created_at?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      style_cartridges: {
        Row: {
          id: string
          user_id: string
          source_files: Json | null
          learned_style: Json | null
          mem0_namespace: string
          analysis_status: string
          last_analyzed_at: string | null
          created_at: string
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          source_files?: Json | null
          learned_style?: Json | null
          mem0_namespace: string
          analysis_status?: string
          last_analyzed_at?: string | null
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          source_files?: Json | null
          learned_style?: Json | null
          mem0_namespace?: string
          analysis_status?: string
          last_analyzed_at?: string | null
          created_at?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      preferences_cartridges: {
        Row: {
          id: string
          user_id: string
          language: string
          platform: string
          tone: string
          content_length: string
          hashtag_count: number
          emoji_usage: string
          call_to_action: string
          personalization_level: string
          created_at: string
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          language?: string
          platform?: string
          tone?: string
          content_length?: string
          hashtag_count?: number
          emoji_usage?: string
          call_to_action?: string
          personalization_level?: string
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          language?: string
          platform?: string
          tone?: string
          content_length?: string
          hashtag_count?: number
          emoji_usage?: string
          call_to_action?: string
          personalization_level?: string
          created_at?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      instruction_cartridges: {
        Row: {
          id: string
          user_id: string
          name: string
          description: string | null
          training_docs: Json | null
          extracted_knowledge: Json | null
          mem0_namespace: string
          process_status: string
          last_processed_at: string | null
          created_at: string
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          description?: string | null
          training_docs?: Json | null
          extracted_knowledge?: Json | null
          mem0_namespace: string
          process_status?: string
          last_processed_at?: string | null
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          description?: string | null
          training_docs?: Json | null
          extracted_knowledge?: Json | null
          mem0_namespace?: string
          process_status?: string
          last_processed_at?: string | null
          created_at?: string
          updated_at?: string | null
        }
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

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (Database["public"]["Tables"] & Database["public"]["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (Database["public"]["Tables"] &
        Database["public"]["Views"])
    ? (Database["public"]["Tables"] &
        Database["public"]["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof Database["public"]["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof Database["public"]["Tables"]
    ? Database["public"]["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof Database["public"]["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof Database["public"]["Tables"]
    ? Database["public"]["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof Database["public"]["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof Database["public"]["Enums"]
    ? Database["public"]["Enums"][PublicEnumNameOrOptions]
    : never
