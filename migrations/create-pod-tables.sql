-- Migration: Create Pod System Tables
-- Date: 2025-11-24
-- Description: Creates tables for engagement pods, members, and activity tracking as per data-model.md

-- 1. Pods Table
CREATE TABLE IF NOT EXISTS public.pods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  min_members INTEGER DEFAULT 9,
  auto_engage BOOLEAN DEFAULT true,
  engagement_window_minutes INTEGER DEFAULT 30,
  comment_window_minutes INTEGER DEFAULT 180,
  settings JSONB DEFAULT '{}',
  status TEXT CHECK (status IN ('active', 'paused')) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(client_id, name)
);

CREATE INDEX IF NOT EXISTS idx_pods_client ON public.pods(client_id);
CREATE INDEX IF NOT EXISTS idx_pods_status ON public.pods(status);

-- 2. Pod Members Table
CREATE TABLE IF NOT EXISTS public.pod_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pod_id UUID REFERENCES public.pods(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  linkedin_account_id UUID REFERENCES public.linkedin_accounts(id),
  role TEXT CHECK (role IN ('owner', 'member')) DEFAULT 'member',
  participation_score DECIMAL(3,2) DEFAULT 1.00,
  total_engagements INTEGER DEFAULT 0,
  missed_engagements INTEGER DEFAULT 0,
  status TEXT CHECK (status IN ('active', 'paused', 'removed')) DEFAULT 'active',
  joined_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(pod_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_pod_members_pod ON public.pod_members(pod_id);
CREATE INDEX IF NOT EXISTS idx_pod_members_user ON public.pod_members(user_id);
CREATE INDEX IF NOT EXISTS idx_pod_members_status ON public.pod_members(status);

-- 3. Pod Activities Table
CREATE TABLE IF NOT EXISTS public.pod_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pod_id UUID REFERENCES public.pods(id) ON DELETE CASCADE,
  post_id UUID REFERENCES public.posts(id),
  post_url TEXT NOT NULL,
  post_author_id UUID REFERENCES public.pod_members(id),
  engagement_type TEXT CHECK (engagement_type IN ('like', 'comment', 'repost')),
  member_id UUID REFERENCES public.pod_members(id),
  scheduled_for TIMESTAMPTZ,
  executed_at TIMESTAMPTZ,
  status TEXT CHECK (status IN ('pending', 'completed', 'failed', 'skipped')) DEFAULT 'pending',
  error_message TEXT,
  proof_screenshot_url TEXT, -- Added for Playwright verification
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pod_activities_pod ON public.pod_activities(pod_id);
CREATE INDEX IF NOT EXISTS idx_pod_activities_member ON public.pod_activities(member_id);
CREATE INDEX IF NOT EXISTS idx_pod_activities_scheduled ON public.pod_activities(scheduled_for)
  WHERE status = 'pending';

-- Enable RLS
ALTER TABLE public.pods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pod_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pod_activities ENABLE ROW LEVEL SECURITY;

-- Basic RLS Policies (Client Isolation)
CREATE POLICY "Pods are viewable by client users"
  ON public.pods FOR SELECT
  USING (client_id IN (SELECT client_id FROM public.users WHERE id = auth.uid()));

CREATE POLICY "Pod members viewable by client users"
  ON public.pod_members FOR SELECT
  USING (pod_id IN (
    SELECT id FROM public.pods 
    WHERE client_id IN (SELECT client_id FROM public.users WHERE id = auth.uid())
  ));

CREATE POLICY "Pod activities viewable by client users"
  ON public.pod_activities FOR SELECT
  USING (pod_id IN (
    SELECT id FROM public.pods 
    WHERE client_id IN (SELECT client_id FROM public.users WHERE id = auth.uid())
  ));
