-- Supabase Project: kvjcidxbyimoswntpjcp
-- Click to open in SQL editor: https://supabase.com/dashboard/project/kvjcidxbyimoswntpjcp/sql/new
--
-- Offerings Table Migration
-- Creates table for storing product/service offerings with conversation intelligence support

-- Create offerings table
CREATE TABLE IF NOT EXISTS public.offerings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    elevator_pitch TEXT NOT NULL,
    key_benefits TEXT[] DEFAULT '{}',
    objection_handlers JSONB DEFAULT '{}',
    qualification_questions TEXT[] DEFAULT '{}',
    proof_points JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_offerings_user_id ON public.offerings(user_id);
CREATE INDEX IF NOT EXISTS idx_offerings_created_at ON public.offerings(created_at DESC);

-- Enable RLS
ALTER TABLE public.offerings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can only see their own offerings
CREATE POLICY "Users can view their own offerings"
    ON public.offerings
    FOR SELECT
    USING (auth.uid() = user_id);

-- Users can insert their own offerings
CREATE POLICY "Users can create their own offerings"
    ON public.offerings
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can update their own offerings
CREATE POLICY "Users can update their own offerings"
    ON public.offerings
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Users can delete their own offerings
CREATE POLICY "Users can delete their own offerings"
    ON public.offerings
    FOR DELETE
    USING (auth.uid() = user_id);

-- Trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_offerings_updated_at
    BEFORE UPDATE ON public.offerings
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Insert sample data for testing (optional - comment out if not needed)
-- These will only insert if you have a user in auth.users
-- Replace 'YOUR_USER_ID' with an actual user UUID from your auth.users table

-- Example offering 1
-- INSERT INTO public.offerings (user_id, name, elevator_pitch, key_benefits, objection_handlers, qualification_questions, proof_points)
-- VALUES (
--     'YOUR_USER_ID'::UUID,
--     'Enterprise CRM Solution',
--     'Reduce sales cycle by 40% with AI-powered CRM',
--     ARRAY['40% reduction in sales cycle', '2x improvement in lead quality', 'Automated follow-ups'],
--     '{"price": "ROI typically 5x within 6 months", "timing": "We offer phased implementation", "integration": "Works with your existing stack"}'::JSONB,
--     ARRAY['What is your current sales team size?', 'Which CRM are you using today?', 'What is your average deal size?'],
--     '[
--         {"metric": "Customer Count", "value": "500+ enterprises"},
--         {"metric": "Average ROI", "value": "5.2x"},
--         {"metric": "Time to Value", "value": "30 days"}
--     ]'::JSONB
-- );

-- Example offering 2
-- INSERT INTO public.offerings (user_id, name, elevator_pitch, key_benefits, objection_handlers, qualification_questions, proof_points)
-- VALUES (
--     'YOUR_USER_ID'::UUID,
--     'LinkedIn Lead Gen Platform',
--     '10x your B2B lead generation on LinkedIn',
--     ARRAY['10x increase in qualified leads', 'Automated outreach campaigns', 'AI-powered personalization'],
--     '{"price": "Average customer sees 15x ROI in first quarter", "compliance": "Fully compliant with LinkedIn terms of service", "setup": "Launch your first campaign in under 10 minutes"}'::JSONB,
--     ARRAY['What is your target audience?', 'How many leads do you need per month?', 'What is your current lead gen strategy?'],
--     '[
--         {"metric": "Leads Generated", "value": "1M+ qualified leads"},
--         {"metric": "Customer Success Rate", "value": "94%"},
--         {"metric": "Average Response Rate", "value": "23%"}
--     ]'::JSONB
-- );

-- Grant permissions
GRANT ALL ON public.offerings TO authenticated;
GRANT SELECT ON public.offerings TO anon;

-- Verification query (run after migration to verify)
-- SELECT
--     id,
--     user_id,
--     name,
--     elevator_pitch,
--     array_length(key_benefits, 1) as benefits_count,
--     created_at
-- FROM public.offerings
-- ORDER BY created_at DESC;
