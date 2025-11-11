export interface DMSequence {
  id: string;
  campaign_id: string;
  client_id: string;
  name: string;
  description: string | null;
  status: 'active' | 'paused' | 'archived';

  // Step 1: Initial DM
  step1_template: string;
  step1_delay_min: number;
  step1_delay_max: number;
  voice_cartridge_id: string | null;

  // Step 2: Email capture
  step2_auto_extract: boolean;
  step2_confirmation_template: string;

  // Step 3: Backup DM
  step3_enabled: boolean;
  step3_delay: number;
  step3_template: string;
  step3_link_expiry: number;

  // Analytics
  sent_count: number;
  replied_count: number;
  email_captured_count: number;

  created_at: string;
  updated_at: string;
}

export interface DMDelivery {
  id: string;
  sequence_id: string;
  lead_id: string;
  step_number: 1 | 2 | 3;
  status: 'pending' | 'sent' | 'delivered' | 'failed';
  sent_at: string | null;
  delivered_at: string | null;
  replied_at: string | null;
  message_content: string;
  unipile_message_id: string | null;
  email_extracted: string | null;
  extraction_confidence: number | null;
  extraction_method: 'regex' | 'gpt4o' | 'manual' | null;
  error_message: string | null;
  retry_count: number;
  last_retry_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateDMSequenceInput {
  campaign_id: string;
  name: string;
  description?: string;
  step1_template: string;
  step1_delay_min?: number;
  step1_delay_max?: number;
  voice_cartridge_id?: string;
  step2_confirmation_template?: string;
  step3_enabled?: boolean;
  step3_delay?: number;
  step3_template?: string;
  step3_link_expiry?: number;
}

export interface UpdateDMSequenceInput extends Partial<CreateDMSequenceInput> {
  status?: 'active' | 'paused' | 'archived';
}
