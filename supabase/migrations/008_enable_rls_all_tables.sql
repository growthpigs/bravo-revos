-- Enable Row Level Security on all public tables
-- This is CRITICAL for multi-tenant security
-- Migration: 008_enable_rls_all_tables

-- Enable RLS on core multi-tenant tables
ALTER TABLE IF EXISTS public.agencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.users ENABLE ROW LEVEL SECURITY;

-- Enable RLS on LinkedIn tables
ALTER TABLE IF EXISTS public.linkedin_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.comments ENABLE ROW LEVEL SECURITY;

-- Enable RLS on campaign tables
ALTER TABLE IF EXISTS public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.lead_magnets ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.dm_sequences ENABLE ROW LEVEL SECURITY;

-- Enable RLS on webhook tables
ALTER TABLE IF EXISTS public.webhook_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.webhook_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.webhook_delivery_logs ENABLE ROW LEVEL SECURITY;

-- Enable RLS on pod tables
ALTER TABLE IF EXISTS public.pods ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.pod_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.pod_activities ENABLE ROW LEVEL SECURITY;

-- Enable RLS on cartridge tables (if not already)
ALTER TABLE IF EXISTS public.cartridges ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- NOTE: These RLS ENABLE statements only work if there are no conflicting
-- policies. If you get errors, it means RLS was already enabled or there's
-- a policy conflict. This migration is IDEMPOTENT and can be re-run safely.
-- ============================================================================
