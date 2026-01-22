// Exported enum types for convenience (must match Database["public"]["Enums"])
export type HealthStatus = 'green' | 'yellow' | 'red'
export type TicketStatus = 'new' | 'in_progress' | 'waiting_client' | 'resolved'
export type TicketPriority = 'low' | 'medium' | 'high' | 'critical'
export type TicketCategory = string
export type DocumentCategory = string
export type IndexStatus = 'pending' | 'processing' | 'indexing' | 'indexed' | 'completed' | 'failed'
export type CommunicationPlatform = 'email' | 'slack'
export type IntegrationProvider = 'slack' | 'gmail' | 'google_ads' | 'meta_ads'
export type OAuthProvider = 'gmail' | 'slack' | 'meta' | 'stripe' | 'linkedin'
export type PreferenceCategory = string
export type UserRole = 'owner' | 'admin' | 'manager' | 'member'
export type WorkflowStatus = 'active' | 'paused' | 'disabled'

// Onboarding types (from database enums)
export type FieldType = 'text' | 'email' | 'url' | 'number' | 'textarea' | 'select'
export type OnboardingStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled'
export type StageStatus = 'pending' | 'in_progress' | 'completed' | 'blocked'

// Cartridges
export interface Cartridge {
  id: string
  agency_id: string
  name: string
  description?: string
  type: 'voice' | 'brand' | 'style' | 'instructions'
  tier: 'system' | 'agency' | 'client' | 'user'
  is_active: boolean
  is_default: boolean
  client_id?: string
  user_id?: string
  parent_id?: string

  // Voice
  voice_tone?: string
  voice_style?: string
  voice_personality?: string
  voice_vocabulary?: string

  // Brand
  brand_name?: string
  brand_tagline?: string
  brand_values?: string[]
  brand_logo_url?: string

  // Style
  style_primary_color?: string
  style_secondary_color?: string
  style_fonts?: string[]

  // Instructions
  instructions_system_prompt?: string
  instructions_rules?: string[]

  created_by: string
  created_at: string
  updated_at: string
}

export type CartridgeType = 'voice' | 'brand' | 'style' | 'instructions'
export type CartridgeTier = 'system' | 'agency' | 'client' | 'user'

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
      ad_performance: {
        Row: {
          account_id: string
          agency_id: string
          campaign_id: string | null
          clicks: number
          client_id: string
          conversions: number
          created_at: string
          date: string
          id: string
          impressions: number
          platform: Database["public"]["Enums"]["ad_platform"]
          revenue: number | null
          spend: number
        }
        Insert: {
          account_id: string
          agency_id: string
          campaign_id?: string | null
          clicks?: number
          client_id: string
          conversions?: number
          created_at?: string
          date: string
          id?: string
          impressions?: number
          platform: Database["public"]["Enums"]["ad_platform"]
          revenue?: number | null
          spend: number
        }
        Update: {
          account_id?: string
          agency_id?: string
          campaign_id?: string | null
          clicks?: number
          client_id?: string
          conversions?: number
          created_at?: string
          date?: string
          id?: string
          impressions?: number
          platform?: Database["public"]["Enums"]["ad_platform"]
          revenue?: number | null
          spend?: number
        }
        Relationships: [
          {
            foreignKeyName: "ad_performance_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agency"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_performance_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client"
            referencedColumns: ["id"]
          },
        ]
      }
      agency: {
        Row: {
          business_hours: Json | null
          created_at: string
          domain: string | null
          health_thresholds: Json
          id: string
          logo_url: string | null
          name: string
          pipeline_stages: string[]
          slug: string
          timezone: string
          updated_at: string
        }
        Insert: {
          business_hours?: Json | null
          created_at?: string
          domain?: string | null
          health_thresholds?: Json
          id?: string
          logo_url?: string | null
          name: string
          pipeline_stages?: string[]
          slug: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          business_hours?: Json | null
          created_at?: string
          domain?: string | null
          health_thresholds?: Json
          id?: string
          logo_url?: string | null
          name?: string
          pipeline_stages?: string[]
          slug?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      alert: {
        Row: {
          agency_id: string
          client_id: string | null
          confidence: number
          created_at: string
          description: string
          id: string
          metadata: Json | null
          resolved_at: string | null
          resolved_by: string | null
          severity: Database["public"]["Enums"]["alert_severity"]
          snoozed_until: string | null
          status: Database["public"]["Enums"]["alert_status"]
          suggested_action: string | null
          title: string
          type: Database["public"]["Enums"]["alert_type"]
          updated_at: string
        }
        Insert: {
          agency_id: string
          client_id?: string | null
          confidence: number
          created_at?: string
          description: string
          id?: string
          metadata?: Json | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity: Database["public"]["Enums"]["alert_severity"]
          snoozed_until?: string | null
          status?: Database["public"]["Enums"]["alert_status"]
          suggested_action?: string | null
          title: string
          type: Database["public"]["Enums"]["alert_type"]
          updated_at?: string
        }
        Update: {
          agency_id?: string
          client_id?: string | null
          confidence?: number
          created_at?: string
          description?: string
          id?: string
          metadata?: Json | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: Database["public"]["Enums"]["alert_severity"]
          snoozed_until?: string | null
          status?: Database["public"]["Enums"]["alert_status"]
          suggested_action?: string | null
          title?: string
          type?: Database["public"]["Enums"]["alert_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "alert_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agency"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alert_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alert_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "user"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_cartridge: {
        Row: {
          agency_id: string
          benson_blueprint: Json | null
          brand_colors: Json | null
          brand_personality: string[] | null
          brand_voice: string | null
          company_description: string | null
          company_name: string | null
          company_tagline: string | null
          core_messaging: string | null
          core_values: string[] | null
          created_at: string | null
          id: string
          industry: string | null
          logo_url: string | null
          name: string
          social_links: Json | null
          target_audience: string | null
          updated_at: string | null
        }
        Insert: {
          agency_id: string
          benson_blueprint?: Json | null
          brand_colors?: Json | null
          brand_personality?: string[] | null
          brand_voice?: string | null
          company_description?: string | null
          company_name?: string | null
          company_tagline?: string | null
          core_messaging?: string | null
          core_values?: string[] | null
          created_at?: string | null
          id?: string
          industry?: string | null
          logo_url?: string | null
          name: string
          social_links?: Json | null
          target_audience?: string | null
          updated_at?: string | null
        }
        Update: {
          agency_id?: string
          benson_blueprint?: Json | null
          brand_colors?: Json | null
          brand_personality?: string[] | null
          brand_voice?: string | null
          company_description?: string | null
          company_name?: string | null
          company_tagline?: string | null
          core_messaging?: string | null
          core_values?: string[] | null
          created_at?: string | null
          id?: string
          industry?: string | null
          logo_url?: string | null
          name?: string
          social_links?: Json | null
          target_audience?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "brand_cartridge_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agency"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_message: {
        Row: {
          agency_id: string
          citations: Json | null
          content: string
          created_at: string
          id: string
          role: Database["public"]["Enums"]["chat_role"]
          route_used: Database["public"]["Enums"]["chat_route"] | null
          session_id: string
          tokens_used: number | null
        }
        Insert: {
          agency_id: string
          citations?: Json | null
          content: string
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["chat_role"]
          route_used?: Database["public"]["Enums"]["chat_route"] | null
          session_id: string
          tokens_used?: number | null
        }
        Update: {
          agency_id?: string
          citations?: Json | null
          content?: string
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["chat_role"]
          route_used?: Database["public"]["Enums"]["chat_route"] | null
          session_id?: string
          tokens_used?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_message_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agency"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_message_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "chat_session"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_session: {
        Row: {
          agency_id: string
          context: Json | null
          created_at: string
          id: string
          is_active: boolean
          last_message_at: string | null
          title: string | null
          user_id: string
        }
        Insert: {
          agency_id: string
          context?: Json | null
          created_at?: string
          id?: string
          is_active?: boolean
          last_message_at?: string | null
          title?: string | null
          user_id: string
        }
        Update: {
          agency_id?: string
          context?: Json | null
          created_at?: string
          id?: string
          is_active?: boolean
          last_message_at?: string | null
          title?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_session_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agency"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_session_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user"
            referencedColumns: ["id"]
          },
        ]
      }
      client: {
        Row: {
          agency_id: string
          contact_email: string | null
          contact_name: string | null
          created_at: string
          days_in_stage: number
          health_status: Database["public"]["Enums"]["health_status"]
          id: string
          install_date: string | null
          is_active: boolean
          lifetime_value: number | null
          name: string
          notes: string | null
          seo_data: Json | null
          seo_last_refreshed: string | null
          stage: string
          tags: string[] | null
          total_spend: number | null
          updated_at: string
          website_url: string | null
        }
        Insert: {
          agency_id: string
          contact_email?: string | null
          contact_name?: string | null
          created_at?: string
          days_in_stage?: number
          health_status?: Database["public"]["Enums"]["health_status"]
          id?: string
          install_date?: string | null
          is_active?: boolean
          lifetime_value?: number | null
          name: string
          notes?: string | null
          seo_data?: Json | null
          seo_last_refreshed?: string | null
          stage?: string
          tags?: string[] | null
          total_spend?: number | null
          updated_at?: string
          website_url?: string | null
        }
        Update: {
          agency_id?: string
          contact_email?: string | null
          contact_name?: string | null
          created_at?: string
          days_in_stage?: number
          health_status?: Database["public"]["Enums"]["health_status"]
          id?: string
          install_date?: string | null
          is_active?: boolean
          lifetime_value?: number | null
          name?: string
          notes?: string | null
          seo_data?: Json | null
          seo_last_refreshed?: string | null
          stage?: string
          tags?: string[] | null
          total_spend?: number | null
          updated_at?: string
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agency"
            referencedColumns: ["id"]
          },
        ]
      }
      client_assignment: {
        Row: {
          agency_id: string
          client_id: string
          created_at: string
          id: string
          role: Database["public"]["Enums"]["assignment_role"]
          user_id: string
        }
        Insert: {
          agency_id: string
          client_id: string
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["assignment_role"]
          user_id: string
        }
        Update: {
          agency_id?: string
          client_id?: string
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["assignment_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_assignment_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agency"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_assignment_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_assignment_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user"
            referencedColumns: ["id"]
          },
        ]
      }
      cartridges: {
        Row: {
          id: string
          agency_id: string
          name: string
          description: string | null
          type: Database["public"]["Enums"]["cartridge_type"]
          tier: Database["public"]["Enums"]["cartridge_tier"]
          is_active: boolean
          is_default: boolean
          client_id: string | null
          user_id: string | null
          parent_id: string | null
          voice_tone: string | null
          voice_style: string | null
          voice_personality: string | null
          voice_vocabulary: string | null
          brand_name: string | null
          brand_tagline: string | null
          brand_values: string[] | null
          brand_logo_url: string | null
          style_primary_color: string | null
          style_secondary_color: string | null
          style_fonts: string[] | null
          instructions_system_prompt: string | null
          instructions_rules: string[] | null
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          agency_id: string
          name: string
          description?: string | null
          type: Database["public"]["Enums"]["cartridge_type"]
          tier?: Database["public"]["Enums"]["cartridge_tier"]
          is_active?: boolean
          is_default?: boolean
          client_id?: string | null
          user_id?: string | null
          parent_id?: string | null
          voice_tone?: string | null
          voice_style?: string | null
          voice_personality?: string | null
          voice_vocabulary?: string | null
          brand_name?: string | null
          brand_tagline?: string | null
          brand_values?: string[] | null
          brand_logo_url?: string | null
          style_primary_color?: string | null
          style_secondary_color?: string | null
          style_fonts?: string[] | null
          instructions_system_prompt?: string | null
          instructions_rules?: string[] | null
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          agency_id?: string
          name?: string
          description?: string | null
          type?: Database["public"]["Enums"]["cartridge_type"]
          tier?: Database["public"]["Enums"]["cartridge_tier"]
          is_active?: boolean
          is_default?: boolean
          client_id?: string | null
          user_id?: string | null
          parent_id?: string | null
          voice_tone?: string | null
          voice_style?: string | null
          voice_personality?: string | null
          voice_vocabulary?: string | null
          brand_name?: string | null
          brand_tagline?: string | null
          brand_values?: string[] | null
          brand_logo_url?: string | null
          style_primary_color?: string | null
          style_secondary_color?: string | null
          style_fonts?: string[] | null
          instructions_system_prompt?: string | null
          instructions_rules?: string[] | null
          created_by?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cartridges_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agency"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cartridges_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cartridges_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cartridges_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "cartridges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cartridges_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user"
            referencedColumns: ["id"]
          },
        ]
      }
      communication: {
        Row: {
          agency_id: string
          client_id: string
          content: string
          created_at: string
          id: string
          is_inbound: boolean
          message_id: string
          needs_reply: boolean
          platform: Database["public"]["Enums"]["communication_platform"]
          received_at: string
          replied_at: string | null
          replied_by: string | null
          sender_email: string | null
          sender_name: string | null
          subject: string | null
          thread_id: string | null
        }
        Insert: {
          agency_id: string
          client_id: string
          content: string
          created_at?: string
          id?: string
          is_inbound: boolean
          message_id: string
          needs_reply?: boolean
          platform: Database["public"]["Enums"]["communication_platform"]
          received_at: string
          replied_at?: string | null
          replied_by?: string | null
          sender_email?: string | null
          sender_name?: string | null
          subject?: string | null
          thread_id?: string | null
        }
        Update: {
          agency_id?: string
          client_id?: string
          content?: string
          created_at?: string
          id?: string
          is_inbound?: boolean
          message_id?: string
          needs_reply?: boolean
          platform?: Database["public"]["Enums"]["communication_platform"]
          received_at?: string
          replied_at?: string | null
          replied_by?: string | null
          sender_email?: string | null
          sender_name?: string | null
          subject?: string | null
          thread_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "communication_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agency"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communication_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communication_replied_by_fkey"
            columns: ["replied_by"]
            isOneToOne: false
            referencedRelation: "user"
            referencedColumns: ["id"]
          },
        ]
      }
      document: {
        Row: {
          agency_id: string
          category: Database["public"]["Enums"]["document_category"]
          client_id: string | null
          created_at: string
          file_name: string
          file_size: number
          gemini_file_id: string | null
          id: string
          index_status: Database["public"]["Enums"]["index_status"]
          is_active: boolean
          mime_type: string
          page_count: number | null
          storage_path: string
          title: string
          updated_at: string
          uploaded_by: string
          word_count: number | null
        }
        Insert: {
          agency_id: string
          category: Database["public"]["Enums"]["document_category"]
          client_id?: string | null
          created_at?: string
          file_name: string
          file_size: number
          gemini_file_id?: string | null
          id?: string
          index_status?: Database["public"]["Enums"]["index_status"]
          is_active?: boolean
          mime_type: string
          page_count?: number | null
          storage_path: string
          title: string
          updated_at?: string
          uploaded_by: string
          word_count?: number | null
        }
        Update: {
          agency_id?: string
          category?: Database["public"]["Enums"]["document_category"]
          client_id?: string | null
          created_at?: string
          file_name?: string
          file_size?: number
          gemini_file_id?: string | null
          id?: string
          index_status?: Database["public"]["Enums"]["index_status"]
          is_active?: boolean
          mime_type?: string
          page_count?: number | null
          storage_path?: string
          title?: string
          updated_at?: string
          uploaded_by?: string
          word_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "document_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agency"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "user"
            referencedColumns: ["id"]
          },
        ]
      }
      instruction_cartridge: {
        Row: {
          agency_id: string
          created_at: string | null
          description: string | null
          extracted_knowledge: Json | null
          id: string
          last_processed_at: string | null
          mem0_namespace: string | null
          name: string
          process_status: string
          training_docs: Json | null
          updated_at: string | null
        }
        Insert: {
          agency_id: string
          created_at?: string | null
          description?: string | null
          extracted_knowledge?: Json | null
          id?: string
          last_processed_at?: string | null
          mem0_namespace?: string | null
          name: string
          process_status?: string
          training_docs?: Json | null
          updated_at?: string | null
        }
        Update: {
          agency_id?: string
          created_at?: string | null
          description?: string | null
          extracted_knowledge?: Json | null
          id?: string
          last_processed_at?: string | null
          mem0_namespace?: string | null
          name?: string
          process_status?: string
          training_docs?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "instruction_cartridge_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agency"
            referencedColumns: ["id"]
          },
        ]
      }
      intake_form_field: {
        Row: {
          agency_id: string
          created_at: string
          field_label: string
          field_type: Database["public"]["Enums"]["field_type"]
          id: string
          is_active: boolean
          is_required: boolean
          journey_id: string | null
          options: Json | null
          placeholder: string | null
          sort_order: number
          updated_at: string
          validation_regex: string | null
        }
        Insert: {
          agency_id: string
          created_at?: string
          field_label: string
          field_type?: Database["public"]["Enums"]["field_type"]
          id?: string
          is_active?: boolean
          is_required?: boolean
          journey_id?: string | null
          options?: Json | null
          placeholder?: string | null
          sort_order?: number
          updated_at?: string
          validation_regex?: string | null
        }
        Update: {
          agency_id?: string
          created_at?: string
          field_label?: string
          field_type?: Database["public"]["Enums"]["field_type"]
          id?: string
          is_active?: boolean
          is_required?: boolean
          journey_id?: string | null
          options?: Json | null
          placeholder?: string | null
          sort_order?: number
          updated_at?: string
          validation_regex?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "intake_form_field_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agency"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intake_form_field_journey_id_fkey"
            columns: ["journey_id"]
            isOneToOne: false
            referencedRelation: "onboarding_journey"
            referencedColumns: ["id"]
          },
        ]
      }
      intake_response: {
        Row: {
          agency_id: string
          field_id: string
          id: string
          instance_id: string
          submitted_at: string
          value: string | null
        }
        Insert: {
          agency_id: string
          field_id: string
          id?: string
          instance_id: string
          submitted_at?: string
          value?: string | null
        }
        Update: {
          agency_id?: string
          field_id?: string
          id?: string
          instance_id?: string
          submitted_at?: string
          value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "intake_response_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agency"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intake_response_field_id_fkey"
            columns: ["field_id"]
            isOneToOne: false
            referencedRelation: "intake_form_field"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intake_response_instance_id_fkey"
            columns: ["instance_id"]
            isOneToOne: false
            referencedRelation: "onboarding_instance"
            referencedColumns: ["id"]
          },
        ]
      }
      integration: {
        Row: {
          access_token: string | null
          agency_id: string
          config: Json | null
          created_at: string
          id: string
          is_connected: boolean
          last_sync_at: string | null
          provider: Database["public"]["Enums"]["integration_provider"]
          refresh_token: string | null
          token_expires_at: string | null
          updated_at: string
        }
        Insert: {
          access_token?: string | null
          agency_id: string
          config?: Json | null
          created_at?: string
          id?: string
          is_connected?: boolean
          last_sync_at?: string | null
          provider: Database["public"]["Enums"]["integration_provider"]
          refresh_token?: string | null
          token_expires_at?: string | null
          updated_at?: string
        }
        Update: {
          access_token?: string | null
          agency_id?: string
          config?: Json | null
          created_at?: string
          id?: string
          is_connected?: boolean
          last_sync_at?: string | null
          provider?: Database["public"]["Enums"]["integration_provider"]
          refresh_token?: string | null
          token_expires_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "integration_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agency"
            referencedColumns: ["id"]
          },
        ]
      }
      user_oauth_credential: {
        Row: {
          id: string
          user_id: string
          type: 'gmail' | 'slack' | 'meta' | 'stripe' | 'linkedin'
          access_token: string
          refresh_token: string | null
          is_connected: boolean
          last_sync_at: string | null
          error_message: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: 'gmail' | 'slack' | 'meta' | 'stripe' | 'linkedin'
          access_token: string
          refresh_token?: string | null
          is_connected?: boolean
          last_sync_at?: string | null
          error_message?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          type?: 'gmail' | 'slack' | 'meta' | 'stripe' | 'linkedin'
          access_token?: string
          refresh_token?: string | null
          is_connected?: boolean
          last_sync_at?: string | null
          error_message?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_oauth_credential_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user"
            referencedColumns: ["id"]
          },
        ]
      }
      kpi_snapshot: {
        Row: {
          agency_id: string
          created_at: string
          id: string
          metadata: Json | null
          metric_name: string
          previous_value: number | null
          snapshot_date: string
          value: number
        }
        Insert: {
          agency_id: string
          created_at?: string
          id?: string
          metadata?: Json | null
          metric_name: string
          previous_value?: number | null
          snapshot_date: string
          value: number
        }
        Update: {
          agency_id?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          metric_name?: string
          previous_value?: number | null
          snapshot_date?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "kpi_snapshot_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agency"
            referencedColumns: ["id"]
          },
        ]
      }
      member_client_access: {
        Row: {
          agency_id: string
          assigned_at: string
          assigned_by: string
          client_id: string
          id: string
          permission: Database["public"]["Enums"]["client_access_permission"]
          user_id: string
        }
        Insert: {
          agency_id: string
          assigned_at?: string
          assigned_by: string
          client_id: string
          id?: string
          permission: Database["public"]["Enums"]["client_access_permission"]
          user_id: string
        }
        Update: {
          agency_id?: string
          assigned_at?: string
          assigned_by?: string
          client_id?: string
          id?: string
          permission?: Database["public"]["Enums"]["client_access_permission"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_client_access_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agency"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_client_access_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "user"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_client_access_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_client_access_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_instance: {
        Row: {
          agency_id: string
          ai_analysis: string | null
          ai_analysis_generated_at: string | null
          client_id: string
          completed_at: string | null
          created_at: string
          current_stage_id: string | null
          id: string
          journey_id: string
          link_token: string
          seo_data: Json | null
          status: Database["public"]["Enums"]["onboarding_status"]
          triggered_at: string
          triggered_by: string
          updated_at: string
        }
        Insert: {
          agency_id: string
          ai_analysis?: string | null
          ai_analysis_generated_at?: string | null
          client_id: string
          completed_at?: string | null
          created_at?: string
          current_stage_id?: string | null
          id?: string
          journey_id: string
          link_token: string
          seo_data?: Json | null
          status?: Database["public"]["Enums"]["onboarding_status"]
          triggered_at?: string
          triggered_by: string
          updated_at?: string
        }
        Update: {
          agency_id?: string
          ai_analysis?: string | null
          ai_analysis_generated_at?: string | null
          client_id?: string
          completed_at?: string | null
          created_at?: string
          current_stage_id?: string | null
          id?: string
          journey_id?: string
          link_token?: string
          seo_data?: Json | null
          status?: Database["public"]["Enums"]["onboarding_status"]
          triggered_at?: string
          triggered_by?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_instance_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agency"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_instance_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_instance_journey_id_fkey"
            columns: ["journey_id"]
            isOneToOne: false
            referencedRelation: "onboarding_journey"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_instance_triggered_by_fkey"
            columns: ["triggered_by"]
            isOneToOne: false
            referencedRelation: "user"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_journey: {
        Row: {
          agency_id: string
          ai_analysis_prompt: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          is_default: boolean
          name: string
          stages: Json
          updated_at: string
          welcome_video_url: string | null
        }
        Insert: {
          agency_id: string
          ai_analysis_prompt?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          name: string
          stages?: Json
          updated_at?: string
          welcome_video_url?: string | null
        }
        Update: {
          agency_id?: string
          ai_analysis_prompt?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          name?: string
          stages?: Json
          updated_at?: string
          welcome_video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_journey_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agency"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_stage_status: {
        Row: {
          agency_id: string
          blocked_reason: string | null
          completed_at: string | null
          completed_by: string | null
          created_at: string
          id: string
          instance_id: string
          platform_statuses: Json | null
          stage_id: string
          status: Database["public"]["Enums"]["stage_status"]
          updated_at: string
        }
        Insert: {
          agency_id: string
          blocked_reason?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          id?: string
          instance_id: string
          platform_statuses?: Json | null
          stage_id: string
          status?: Database["public"]["Enums"]["stage_status"]
          updated_at?: string
        }
        Update: {
          agency_id?: string
          blocked_reason?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          id?: string
          instance_id?: string
          platform_statuses?: Json | null
          stage_id?: string
          status?: Database["public"]["Enums"]["stage_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_stage_status_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agency"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_stage_status_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "user"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_stage_status_instance_id_fkey"
            columns: ["instance_id"]
            isOneToOne: false
            referencedRelation: "onboarding_instance"
            referencedColumns: ["id"]
          },
        ]
      }
      permission: {
        Row: {
          action: Database["public"]["Enums"]["permission_action"]
          created_at: string
          description: string | null
          id: string
          resource: Database["public"]["Enums"]["resource_type"]
        }
        Insert: {
          action: Database["public"]["Enums"]["permission_action"]
          created_at?: string
          description?: string | null
          id?: string
          resource: Database["public"]["Enums"]["resource_type"]
        }
        Update: {
          action?: Database["public"]["Enums"]["permission_action"]
          created_at?: string
          description?: string | null
          id?: string
          resource?: Database["public"]["Enums"]["resource_type"]
        }
        Relationships: []
      }
      preferences_cartridge: {
        Row: {
          agency_id: string
          call_to_action: string
          content_length: string
          created_at: string | null
          emoji_usage: string
          hashtag_count: number | null
          id: string
          language: string
          personalization_level: string
          platform: string
          tone: string
          updated_at: string | null
        }
        Insert: {
          agency_id: string
          call_to_action: string
          content_length: string
          created_at?: string | null
          emoji_usage: string
          hashtag_count?: number | null
          id?: string
          language?: string
          personalization_level: string
          platform: string
          tone: string
          updated_at?: string | null
        }
        Update: {
          agency_id?: string
          call_to_action?: string
          content_length?: string
          created_at?: string | null
          emoji_usage?: string
          hashtag_count?: number | null
          id?: string
          language?: string
          personalization_level?: string
          platform?: string
          tone?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "preferences_cartridge_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agency"
            referencedColumns: ["id"]
          },
        ]
      }
      role: {
        Row: {
          agency_id: string
          created_at: string
          created_by: string | null
          description: string | null
          hierarchy_level: number | null
          id: string
          is_system: boolean
          name: string
          updated_at: string
        }
        Insert: {
          agency_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          hierarchy_level?: number | null
          id?: string
          is_system?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          agency_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          hierarchy_level?: number | null
          id?: string
          is_system?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agency"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permission: {
        Row: {
          agency_id: string
          granted_at: string
          granted_by: string | null
          id: string
          permission_id: string
          role_id: string
        }
        Insert: {
          agency_id: string
          granted_at?: string
          granted_by?: string | null
          id?: string
          permission_id: string
          role_id: string
        }
        Update: {
          agency_id?: string
          granted_at?: string
          granted_by?: string | null
          id?: string
          permission_id?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permission_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agency"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_permission_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "user"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_permission_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permission"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_permission_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "role"
            referencedColumns: ["id"]
          },
        ]
      }
      stage_event: {
        Row: {
          agency_id: string
          client_id: string
          from_stage: string | null
          id: string
          moved_at: string
          moved_by: string
          notes: string | null
          to_stage: string
        }
        Insert: {
          agency_id: string
          client_id: string
          from_stage?: string | null
          id?: string
          moved_at?: string
          moved_by: string
          notes?: string | null
          to_stage: string
        }
        Update: {
          agency_id?: string
          client_id?: string
          from_stage?: string | null
          id?: string
          moved_at?: string
          moved_by?: string
          notes?: string | null
          to_stage?: string
        }
        Relationships: [
          {
            foreignKeyName: "stage_event_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agency"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stage_event_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stage_event_moved_by_fkey"
            columns: ["moved_by"]
            isOneToOne: false
            referencedRelation: "user"
            referencedColumns: ["id"]
          },
        ]
      }
      style_cartridge: {
        Row: {
          agency_id: string
          analysis_status: string
          created_at: string | null
          id: string
          learned_style: Json | null
          mem0_namespace: string | null
          source_files: Json | null
          updated_at: string | null
        }
        Insert: {
          agency_id: string
          analysis_status?: string
          created_at?: string | null
          id?: string
          learned_style?: Json | null
          mem0_namespace?: string | null
          source_files?: Json | null
          updated_at?: string | null
        }
        Update: {
          agency_id?: string
          analysis_status?: string
          created_at?: string | null
          id?: string
          learned_style?: Json | null
          mem0_namespace?: string | null
          source_files?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "style_cartridge_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: true
            referencedRelation: "agency"
            referencedColumns: ["id"]
          },
        ]
      }
      task: {
        Row: {
          agency_id: string
          assigned_to: string | null
          client_id: string
          completed_at: string | null
          completed_by: string | null
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          is_completed: boolean
          name: string
          sort_order: number
          stage: string | null
          updated_at: string
        }
        Insert: {
          agency_id: string
          assigned_to?: string | null
          client_id: string
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          is_completed?: boolean
          name: string
          sort_order?: number
          stage?: string | null
          updated_at?: string
        }
        Update: {
          agency_id?: string
          assigned_to?: string | null
          client_id?: string
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          is_completed?: boolean
          name?: string
          sort_order?: number
          stage?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agency"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "user"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "user"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket: {
        Row: {
          agency_id: string
          assignee_id: string | null
          category: Database["public"]["Enums"]["ticket_category"]
          client_id: string
          created_at: string
          created_by: string
          description: string
          due_date: string | null
          id: string
          number: number
          priority: Database["public"]["Enums"]["ticket_priority"]
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: Database["public"]["Enums"]["ticket_status"]
          time_spent_minutes: number | null
          title: string
          updated_at: string
        }
        Insert: {
          agency_id: string
          assignee_id?: string | null
          category: Database["public"]["Enums"]["ticket_category"]
          client_id: string
          created_at?: string
          created_by: string
          description: string
          due_date?: string | null
          id?: string
          number: number
          priority?: Database["public"]["Enums"]["ticket_priority"]
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: Database["public"]["Enums"]["ticket_status"]
          time_spent_minutes?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          agency_id?: string
          assignee_id?: string | null
          category?: Database["public"]["Enums"]["ticket_category"]
          client_id?: string
          created_at?: string
          created_by?: string
          description?: string
          due_date?: string | null
          id?: string
          number?: number
          priority?: Database["public"]["Enums"]["ticket_priority"]
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: Database["public"]["Enums"]["ticket_status"]
          time_spent_minutes?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agency"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_assignee_id_fkey"
            columns: ["assignee_id"]
            isOneToOne: false
            referencedRelation: "user"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "user"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_note: {
        Row: {
          added_by: string
          agency_id: string
          content: string
          created_at: string
          id: string
          is_internal: boolean
          ticket_id: string
        }
        Insert: {
          added_by: string
          agency_id: string
          content: string
          created_at?: string
          id?: string
          is_internal?: boolean
          ticket_id: string
        }
        Update: {
          added_by?: string
          agency_id?: string
          content?: string
          created_at?: string
          id?: string
          is_internal?: boolean
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_note_added_by_fkey"
            columns: ["added_by"]
            isOneToOne: false
            referencedRelation: "user"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_note_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agency"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_note_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "ticket"
            referencedColumns: ["id"]
          },
        ]
      }
      user: {
        Row: {
          agency_id: string
          avatar_url: string | null
          created_at: string
          email: string
          first_name: string
          id: string
          is_active: boolean
          is_owner: boolean
          last_active_at: string | null
          last_name: string
          preferences: Json | null
          role: Database["public"]["Enums"]["user_role"]
          role_id: string | null
          updated_at: string
        }
        Insert: {
          agency_id: string
          avatar_url?: string | null
          created_at?: string
          email: string
          first_name: string
          id: string
          is_active?: boolean
          is_owner?: boolean
          last_active_at?: string | null
          last_name: string
          preferences?: Json | null
          role?: Database["public"]["Enums"]["user_role"]
          role_id?: string | null
          updated_at?: string
        }
        Update: {
          agency_id?: string
          avatar_url?: string | null
          created_at?: string
          email?: string
          first_name?: string
          id?: string
          is_active?: boolean
          is_owner?: boolean
          last_active_at?: string | null
          last_name?: string
          preferences?: Json | null
          role?: Database["public"]["Enums"]["user_role"]
          role_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agency"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "role"
            referencedColumns: ["id"]
          },
        ]
      }
      user_invitations: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          agency_id: string
          created_at: string
          created_by: string
          email: string
          expires_at: string
          id: string
          role: Database["public"]["Enums"]["user_role"]
          token: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          agency_id: string
          created_at?: string
          created_by: string
          email: string
          expires_at: string
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          token: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          agency_id?: string
          created_at?: string
          created_by?: string
          email?: string
          expires_at?: string
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          token?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_invitations_accepted_by_fkey"
            columns: ["accepted_by"]
            isOneToOne: false
            referencedRelation: "user"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_invitations_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agency"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_invitations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user"
            referencedColumns: ["id"]
          },
        ]
      }
      user_preference: {
        Row: {
          agency_id: string
          category: Database["public"]["Enums"]["preference_category"]
          created_at: string
          id: string
          key: string
          updated_at: string
          user_id: string
          value: Json
        }
        Insert: {
          agency_id: string
          category: Database["public"]["Enums"]["preference_category"]
          created_at?: string
          id?: string
          key: string
          updated_at?: string
          user_id: string
          value: Json
        }
        Update: {
          agency_id?: string
          category?: Database["public"]["Enums"]["preference_category"]
          created_at?: string
          id?: string
          key?: string
          updated_at?: string
          user_id?: string
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "user_preference_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agency"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_preference_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user"
            referencedColumns: ["id"]
          },
        ]
      }
      voice_cartridge: {
        Row: {
          agency_id: string
          created_at: string | null
          display_name: string | null
          id: string
          is_active: boolean | null
          name: string
          system_instructions: string | null
          tier: string
          updated_at: string | null
          voice_params: Json | null
        }
        Insert: {
          agency_id: string
          created_at?: string | null
          display_name?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          system_instructions?: string | null
          tier?: string
          updated_at?: string | null
          voice_params?: Json | null
        }
        Update: {
          agency_id?: string
          created_at?: string | null
          display_name?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          system_instructions?: string | null
          tier?: string
          updated_at?: string | null
          voice_params?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "voice_cartridge_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agency"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow: {
        Row: {
          actions: Json
          agency_id: string
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_active: boolean
          last_run_at: string | null
          name: string
          run_count: number
          success_count: number
          triggers: Json
          updated_at: string
        }
        Insert: {
          actions: Json
          agency_id: string
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          is_active?: boolean
          last_run_at?: string | null
          name: string
          run_count?: number
          success_count?: number
          triggers: Json
          updated_at?: string
        }
        Update: {
          actions?: Json
          agency_id?: string
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_active?: boolean
          last_run_at?: string | null
          name?: string
          run_count?: number
          success_count?: number
          triggers?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agency"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_run: {
        Row: {
          agency_id: string
          completed_at: string | null
          error_message: string | null
          executed_actions: Json | null
          id: string
          started_at: string
          status: Database["public"]["Enums"]["workflow_status"]
          trigger_data: Json
          workflow_id: string
        }
        Insert: {
          agency_id: string
          completed_at?: string | null
          error_message?: string | null
          executed_actions?: Json | null
          id?: string
          started_at?: string
          status?: Database["public"]["Enums"]["workflow_status"]
          trigger_data: Json
          workflow_id: string
        }
        Update: {
          agency_id?: string
          completed_at?: string | null
          error_message?: string | null
          executed_actions?: Json | null
          id?: string
          started_at?: string
          status?: Database["public"]["Enums"]["workflow_status"]
          trigger_data?: Json
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_run_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agency"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_run_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflow"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cleanup_expired_invitations: { Args: never; Returns: undefined }
      get_user_permissions: {
        Args: { p_user_id: string }
        Returns: {
          action: Database["public"]["Enums"]["permission_action"]
          resource: Database["public"]["Enums"]["resource_type"]
          source: string
        }[]
      }
      has_permission: {
        Args: {
          p_action: Database["public"]["Enums"]["permission_action"]
          p_resource: Database["public"]["Enums"]["resource_type"]
          p_user_id: string
        }
        Returns: boolean
      }
      set_cartridge_default: {
        Args: {
          p_cartridge_id: string
          p_agency_id: string
          p_type: Database["public"]["Enums"]["cartridge_type"]
        }
        Returns: {
          success: boolean
          error?: string
        }
      }
    }
    Enums: {
      ad_platform: "google_ads" | "meta_ads"
      alert_severity: "low" | "medium" | "high" | "critical"
      alert_status: "active" | "snoozed" | "dismissed" | "resolved"
      alert_type: "risk_detected" | "kpi_drop" | "inactivity" | "disconnect"
      assignment_role: "owner" | "collaborator"
      cartridge_tier: "system" | "agency" | "client" | "user"
      cartridge_type: "voice" | "brand" | "style" | "instructions"
      chat_role: "user" | "assistant"
      chat_route: "rag" | "web" | "memory" | "casual" | "dashboard"
      client_access_permission: "read" | "write"
      communication_platform: "slack" | "gmail"
      document_category:
        | "installation"
        | "tech"
        | "support"
        | "process"
        | "client_specific"
      field_type: "text" | "email" | "url" | "number" | "textarea" | "select"
      health_status: "green" | "yellow" | "red"
      index_status: "pending" | "indexing" | "indexed" | "failed"
      integration_provider: "slack" | "gmail" | "google_ads" | "meta_ads"
      onboarding_status: "pending" | "in_progress" | "completed" | "cancelled"
      permission_action: "read" | "write" | "delete" | "manage"
      preference_category: "notifications" | "ai" | "display"
      resource_type:
        | "clients"
        | "communications"
        | "tickets"
        | "knowledge-base"
        | "automations"
        | "settings"
        | "users"
        | "billing"
        | "roles"
        | "integrations"
        | "analytics"
        | "ai-features"
      stage_status: "pending" | "in_progress" | "completed" | "blocked"
      ticket_category:
        | "technical"
        | "billing"
        | "campaign"
        | "general"
        | "escalation"
      ticket_priority: "low" | "medium" | "high" | "critical"
      ticket_status: "new" | "in_progress" | "waiting_client" | "resolved"
      user_role: "owner" | "admin" | "manager" | "member"
      workflow_status: "running" | "completed" | "failed"
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
      ad_platform: ["google_ads", "meta_ads"],
      alert_severity: ["low", "medium", "high", "critical"],
      alert_status: ["active", "snoozed", "dismissed", "resolved"],
      alert_type: ["risk_detected", "kpi_drop", "inactivity", "disconnect"],
      assignment_role: ["owner", "collaborator"],
      chat_role: ["user", "assistant"],
      chat_route: ["rag", "web", "memory", "casual", "dashboard"],
      client_access_permission: ["read", "write"],
      communication_platform: ["slack", "gmail"],
      document_category: [
        "installation",
        "tech",
        "support",
        "process",
        "client_specific",
      ],
      field_type: ["text", "email", "url", "number", "textarea", "select"],
      health_status: ["green", "yellow", "red"],
      index_status: ["pending", "indexing", "indexed", "failed"],
      integration_provider: ["slack", "gmail", "google_ads", "meta_ads"],
      onboarding_status: ["pending", "in_progress", "completed", "cancelled"],
      permission_action: ["read", "write", "delete", "manage"],
      preference_category: ["notifications", "ai", "display"],
      resource_type: [
        "clients",
        "communications",
        "tickets",
        "knowledge-base",
        "automations",
        "settings",
        "users",
        "billing",
        "roles",
        "integrations",
        "analytics",
        "ai-features",
      ],
      stage_status: ["pending", "in_progress", "completed", "blocked"],
      ticket_category: [
        "technical",
        "billing",
        "campaign",
        "general",
        "escalation",
      ],
      ticket_priority: ["low", "medium", "high", "critical"],
      ticket_status: ["new", "in_progress", "waiting_client", "resolved"],
      user_role: ["owner", "admin", "manager", "member"],
      workflow_status: ["running", "completed", "failed"],
    },
  },
} as const
