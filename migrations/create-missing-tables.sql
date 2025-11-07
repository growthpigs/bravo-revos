-- Create missing tables individually

-- 13. Voice Cartridges Table
CREATE TABLE IF NOT EXISTS public.voice_cartridges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  tier TEXT DEFAULT 'user',
  tone TEXT,
  style TEXT,
  personality_traits TEXT[],
  banned_words TEXT[],
  emoji_usage BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 12. Webhooks Table
CREATE TABLE IF NOT EXISTS public.webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  event_type TEXT,
  payload JSONB,
  status TEXT DEFAULT 'pending',
  response TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 15. Memories Table (for Mem0)
CREATE TABLE IF NOT EXISTS public.memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_key TEXT NOT NULL,
  memory_content TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 16. Email Queue Table
CREATE TABLE IF NOT EXISTS public.email_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_email TEXT NOT NULL,
  subject TEXT,
  body TEXT,
  status TEXT DEFAULT 'pending',
  attempts INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 17. Activity Logs Table
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  action TEXT,
  resource_type TEXT,
  resource_id UUID,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 11. Pod Activities DLQ Table
CREATE TABLE IF NOT EXISTS public.pod_activities_dlq (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id UUID,
  pod_id UUID,
  post_id UUID,
  error_type TEXT,
  error_message TEXT,
  attempts INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create remaining indexes
CREATE INDEX IF NOT EXISTS idx_webhooks_client_id ON public.webhooks(client_id);
CREATE INDEX IF NOT EXISTS idx_voice_cartridges_client_id ON public.voice_cartridges(client_id);
CREATE INDEX IF NOT EXISTS idx_memories_tenant ON public.memories(tenant_key);
CREATE INDEX IF NOT EXISTS idx_pod_activities_dlq_activity ON public.pod_activities_dlq(activity_id);

-- Enable RLS on remaining tables
ALTER TABLE public.voice_cartridges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pod_activities_dlq ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for remaining tables
CREATE POLICY "Users can access voice cartridges"
  ON public.voice_cartridges FOR SELECT
  USING (client_id IN (SELECT client_id FROM public.users WHERE id = auth.uid()));

CREATE POLICY "Users can access their webhooks"
  ON public.webhooks FOR SELECT
  USING (client_id IN (SELECT client_id FROM public.users WHERE id = auth.uid()));

CREATE POLICY "Users can access their memories"
  ON public.memories FOR SELECT
  USING (tenant_key LIKE (SELECT CONCAT(client_id, '::', id, ':%') FROM public.users WHERE id = auth.uid()));

CREATE POLICY "Email queue is accessible"
  ON public.email_queue FOR SELECT
  USING (true);

CREATE POLICY "Users can access activity logs"
  ON public.activity_logs FOR SELECT
  USING (user_id = auth.uid() OR user_id IS NULL);
