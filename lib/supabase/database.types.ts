export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      agencies: {
        Row: {
          id: string
          name: string
          slug: string
          logo_url: string | null
          settings: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          logo_url?: string | null
          settings?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          logo_url?: string | null
          settings?: Json
          created_at?: string
          updated_at?: string
        }
      }
      clients: {
        Row: {
          id: string
          agency_id: string
          name: string
          slug: string
          logo_url: string | null
          settings: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          agency_id: string
          name: string
          slug: string
          logo_url?: string | null
          settings?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          agency_id?: string
          name?: string
          slug?: string
          logo_url?: string | null
          settings?: Json
          created_at?: string
          updated_at?: string
        }
      }
      users: {
        Row: {
          id: string
          agency_id: string | null
          client_id: string | null
          email: string
          full_name: string | null
          avatar_url: string | null
          role: 'agency_admin' | 'agency_member' | 'client_admin' | 'client_member'
          settings: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          agency_id?: string | null
          client_id?: string | null
          email: string
          full_name?: string | null
          avatar_url?: string | null
          role?: 'agency_admin' | 'agency_member' | 'client_admin' | 'client_member'
          settings?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          agency_id?: string | null
          client_id?: string | null
          email?: string
          full_name?: string | null
          avatar_url?: string | null
          role?: 'agency_admin' | 'agency_member' | 'client_admin' | 'client_member'
          settings?: Json
          created_at?: string
          updated_at?: string
        }
      }
      linkedin_accounts: {
        Row: {
          id: string
          client_id: string
          account_name: string
          account_email: string
          profile_url: string | null
          encrypted_access_token: string | null
          encrypted_refresh_token: string | null
          encryption_key_id: string | null
          is_active: boolean
          last_sync_at: string | null
          daily_dm_count: number
          daily_post_count: number
          rate_limit_reset_at: string | null
          settings: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          client_id: string
          account_name: string
          account_email: string
          profile_url?: string | null
          encrypted_access_token?: string | null
          encrypted_refresh_token?: string | null
          encryption_key_id?: string | null
          is_active?: boolean
          last_sync_at?: string | null
          daily_dm_count?: number
          daily_post_count?: number
          rate_limit_reset_at?: string | null
          settings?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          client_id?: string
          account_name?: string
          account_email?: string
          profile_url?: string | null
          encrypted_access_token?: string | null
          encrypted_refresh_token?: string | null
          encryption_key_id?: string | null
          is_active?: boolean
          last_sync_at?: string | null
          daily_dm_count?: number
          daily_post_count?: number
          rate_limit_reset_at?: string | null
          settings?: Json
          created_at?: string
          updated_at?: string
        }
      }
      campaigns: {
        Row: {
          id: string
          client_id: string
          name: string
          description: string | null
          status: 'draft' | 'active' | 'paused' | 'completed' | 'archived'
          trigger_words: string[]
          post_schedule: Json
          settings: Json
          total_leads: number
          total_conversions: number
          started_at: string | null
          ended_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          client_id: string
          name: string
          description?: string | null
          status?: 'draft' | 'active' | 'paused' | 'completed' | 'archived'
          trigger_words?: string[]
          post_schedule?: Json
          settings?: Json
          total_leads?: number
          total_conversions?: number
          started_at?: string | null
          ended_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          client_id?: string
          name?: string
          description?: string | null
          status?: 'draft' | 'active' | 'paused' | 'completed' | 'archived'
          trigger_words?: string[]
          post_schedule?: Json
          settings?: Json
          total_leads?: number
          total_conversions?: number
          started_at?: string | null
          ended_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      lead_magnets: {
        Row: {
          id: string
          campaign_id: string
          title: string
          description: string | null
          file_url: string
          file_name: string
          file_size: number | null
          file_type: string | null
          download_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          campaign_id: string
          title: string
          description?: string | null
          file_url: string
          file_name: string
          file_size?: number | null
          file_type?: string | null
          download_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          campaign_id?: string
          title?: string
          description?: string | null
          file_url?: string
          file_name?: string
          file_size?: number | null
          file_type?: string | null
          download_count?: number
          created_at?: string
          updated_at?: string
        }
      }
      leads: {
        Row: {
          id: string
          campaign_id: string
          linkedin_account_id: string | null
          linkedin_profile_url: string | null
          full_name: string | null
          email: string | null
          phone: string | null
          company: string | null
          title: string | null
          status: 'comment_detected' | 'dm_sent' | 'email_captured' | 'webhook_sent' | 'failed'
          comment_id: string | null
          dm_sent_at: string | null
          email_captured_at: string | null
          webhook_sent_at: string | null
          last_interaction_at: string | null
          notes: string | null
          tags: string[]
          custom_fields: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          campaign_id: string
          linkedin_account_id?: string | null
          linkedin_profile_url?: string | null
          full_name?: string | null
          email?: string | null
          phone?: string | null
          company?: string | null
          title?: string | null
          status?: 'comment_detected' | 'dm_sent' | 'email_captured' | 'webhook_sent' | 'failed'
          comment_id?: string | null
          dm_sent_at?: string | null
          email_captured_at?: string | null
          webhook_sent_at?: string | null
          last_interaction_at?: string | null
          notes?: string | null
          tags?: string[]
          custom_fields?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          campaign_id?: string
          linkedin_account_id?: string | null
          linkedin_profile_url?: string | null
          full_name?: string | null
          email?: string | null
          phone?: string | null
          company?: string | null
          title?: string | null
          status?: 'comment_detected' | 'dm_sent' | 'email_captured' | 'webhook_sent' | 'failed'
          comment_id?: string | null
          dm_sent_at?: string | null
          email_captured_at?: string | null
          webhook_sent_at?: string | null
          last_interaction_at?: string | null
          notes?: string | null
          tags?: string[]
          custom_fields?: Json
          created_at?: string
          updated_at?: string
        }
      }
      posts: {
        Row: {
          id: string
          linkedin_account_id: string
          campaign_id: string | null
          linkedin_post_id: string | null
          content: string
          scheduled_for: string | null
          published_at: string | null
          engagement_count: number
          comment_count: number
          last_checked_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          linkedin_account_id: string
          campaign_id?: string | null
          linkedin_post_id?: string | null
          content: string
          scheduled_for?: string | null
          published_at?: string | null
          engagement_count?: number
          comment_count?: number
          last_checked_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          linkedin_account_id?: string
          campaign_id?: string | null
          linkedin_post_id?: string | null
          content?: string
          scheduled_for?: string | null
          published_at?: string | null
          engagement_count?: number
          comment_count?: number
          last_checked_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      comments: {
        Row: {
          id: string
          post_id: string
          linkedin_comment_id: string
          author_name: string
          author_profile_url: string | null
          content: string
          trigger_words: string[] | null
          is_trigger_match: boolean
          created_at: string
        }
        Insert: {
          id?: string
          post_id: string
          linkedin_comment_id: string
          author_name: string
          author_profile_url?: string | null
          content: string
          trigger_words?: string[] | null
          is_trigger_match?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          post_id?: string
          linkedin_comment_id?: string
          author_name?: string
          author_profile_url?: string | null
          content?: string
          trigger_words?: string[] | null
          is_trigger_match?: boolean
          created_at?: string
        }
      }
      dm_sequences: {
        Row: {
          id: string
          campaign_id: string
          name: string
          sequence_order: number
          message_template: string
          delay_hours: number
          is_backup: boolean
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          campaign_id: string
          name: string
          sequence_order: number
          message_template: string
          delay_hours?: number
          is_backup?: boolean
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          campaign_id?: string
          name?: string
          sequence_order?: number
          message_template?: string
          delay_hours?: number
          is_backup?: boolean
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      dm_deliveries: {
        Row: {
          id: string
          lead_id: string
          dm_sequence_id: string
          message_content: string
          sent_at: string | null
          delivered_at: string | null
          read_at: string | null
          replied_at: string | null
          reply_content: string | null
          status: string
          error_message: string | null
          created_at: string
        }
        Insert: {
          id?: string
          lead_id: string
          dm_sequence_id: string
          message_content: string
          sent_at?: string | null
          delivered_at?: string | null
          read_at?: string | null
          replied_at?: string | null
          reply_content?: string | null
          status?: string
          error_message?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          lead_id?: string
          dm_sequence_id?: string
          message_content?: string
          sent_at?: string | null
          delivered_at?: string | null
          read_at?: string | null
          replied_at?: string | null
          reply_content?: string | null
          status?: string
          error_message?: string | null
          created_at?: string
        }
      }
      cartridges: {
        Row: {
          id: string
          name: string
          description: string | null
          tier: 'system' | 'workspace' | 'user' | 'skill'
          agency_id: string | null
          client_id: string | null
          user_id: string | null
          parent_cartridge_id: string | null
          voice_parameters: Json
          usage_count: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          tier: 'system' | 'workspace' | 'user' | 'skill'
          agency_id?: string | null
          client_id?: string | null
          user_id?: string | null
          parent_cartridge_id?: string | null
          voice_parameters?: Json
          usage_count?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          tier?: 'system' | 'workspace' | 'user' | 'skill'
          agency_id?: string | null
          client_id?: string | null
          user_id?: string | null
          parent_cartridge_id?: string | null
          voice_parameters?: Json
          usage_count?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      pods: {
        Row: {
          id: string
          client_id: string
          name: string
          description: string | null
          engagement_schedule: Json
          min_members: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          client_id: string
          name: string
          description?: string | null
          engagement_schedule?: Json
          min_members?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          client_id?: string
          name?: string
          description?: string | null
          engagement_schedule?: Json
          min_members?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      pod_members: {
        Row: {
          id: string
          pod_id: string
          user_id: string
          linkedin_account_id: string | null
          participation_rate: number
          last_activity_at: string | null
          joined_at: string
        }
        Insert: {
          id?: string
          pod_id: string
          user_id: string
          linkedin_account_id?: string | null
          participation_rate?: number
          last_activity_at?: string | null
          joined_at?: string
        }
        Update: {
          id?: string
          pod_id?: string
          user_id?: string
          linkedin_account_id?: string | null
          participation_rate?: number
          last_activity_at?: string | null
          joined_at?: string
        }
      }
      pod_activities: {
        Row: {
          id: string
          pod_id: string
          member_id: string
          post_id: string | null
          activity_type: string
          completed: boolean
          completed_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          pod_id: string
          member_id: string
          post_id?: string | null
          activity_type: string
          completed?: boolean
          completed_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          pod_id?: string
          member_id?: string
          post_id?: string | null
          activity_type?: string
          completed?: boolean
          completed_at?: string | null
          created_at?: string
        }
      }
      webhook_configs: {
        Row: {
          id: string
          client_id: string
          campaign_id: string | null
          name: string
          webhook_url: string
          webhook_type: string | null
          auth_type: string
          auth_credentials: Json
          headers: Json
          payload_template: Json
          is_active: boolean
          retry_config: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          client_id: string
          campaign_id?: string | null
          name: string
          webhook_url: string
          webhook_type?: string | null
          auth_type?: string
          auth_credentials?: Json
          headers?: Json
          payload_template?: Json
          is_active?: boolean
          retry_config?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          client_id?: string
          campaign_id?: string | null
          name?: string
          webhook_url?: string
          webhook_type?: string | null
          auth_type?: string
          auth_credentials?: Json
          headers?: Json
          payload_template?: Json
          is_active?: boolean
          retry_config?: Json
          created_at?: string
          updated_at?: string
        }
      }
      webhook_deliveries: {
        Row: {
          id: string
          webhook_config_id: string
          lead_id: string
          payload: Json
          response_status: number | null
          response_body: string | null
          retry_count: number
          next_retry_at: string | null
          delivered_at: string | null
          failed_at: string | null
          error_message: string | null
          created_at: string
        }
        Insert: {
          id?: string
          webhook_config_id: string
          lead_id: string
          payload: Json
          response_status?: number | null
          response_body?: string | null
          retry_count?: number
          next_retry_at?: string | null
          delivered_at?: string | null
          failed_at?: string | null
          error_message?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          webhook_config_id?: string
          lead_id?: string
          payload?: Json
          response_status?: number | null
          response_body?: string | null
          retry_count?: number
          next_retry_at?: string | null
          delivered_at?: string | null
          failed_at?: string | null
          error_message?: string | null
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      user_role: 'agency_admin' | 'agency_member' | 'client_admin' | 'client_member'
      lead_status: 'comment_detected' | 'dm_sent' | 'email_captured' | 'webhook_sent' | 'failed'
      campaign_status: 'draft' | 'active' | 'paused' | 'completed' | 'archived'
      cartridge_tier: 'system' | 'workspace' | 'user' | 'skill'
    }
  }
}
