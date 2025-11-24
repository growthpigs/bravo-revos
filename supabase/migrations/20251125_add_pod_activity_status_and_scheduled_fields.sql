-- Create activity_status enum
DO $$ BEGIN
  CREATE TYPE activity_status AS ENUM ('pending', 'success', 'failed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add new columns to pod_activities table
ALTER TABLE public.pod_activities
ADD COLUMN status activity_status DEFAULT 'pending' NOT NULL,
ADD COLUMN scheduled_for TIMESTAMP WITH TIME ZONE,
ADD COLUMN proof_screenshot_url TEXT;

-- Drop old 'completed' and 'completed_at' columns if they exist and are no longer needed
ALTER TABLE public.pod_activities
DROP COLUMN IF EXISTS completed,
DROP COLUMN IF EXISTS completed_at;

-- Add RLS policy for pod_activities to allow authenticated users to view their own pod activities
-- and agency_admins/client_admins to view all activities within their agency/client
-- This policy assumes 'pods' table has a 'client_id' and 'client_id' is linked to 'agency_id' through 'clients' table
-- We will need to make sure this is properly set up if not already.

-- Policy for select
ALTER TABLE public.pod_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to view their own pod activities"
ON public.pod_activities FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.pod_members pm
    JOIN public.pods p ON pm.pod_id = p.id
    WHERE pm.id = pod_activities.member_id
      AND pm.user_id = auth.uid()
  ) OR (
    -- Allow agency_admin to view all activities within their agency
    auth.role() = 'agency_admin' AND EXISTS (
      SELECT 1 FROM public.pods p
      JOIN public.clients c ON p.client_id = c.id
      JOIN public.users u ON u.agency_id = c.agency_id
      WHERE p.id = pod_activities.pod_id AND u.id = auth.uid() AND u.role = 'agency_admin'
    )
  ) OR (
    -- Allow client_admin to view all activities within their client
    auth.role() = 'client_admin' AND EXISTS (
      SELECT 1 FROM public.pods p
      JOIN public.users u ON u.client_id = p.client_id
      WHERE p.id = pod_activities.pod_id AND u.id = auth.uid() AND u.role = 'client_admin'
    )
  )
);

-- Policy for insert (e.g., by backend services)
CREATE POLICY "Allow service role to insert pod activities"
ON public.pod_activities FOR INSERT
TO service_role
WITH CHECK (true);

-- Policy for update (e.g., by backend services to update status)
CREATE POLICY "Allow service role to update pod activities"
ON public.pod_activities FOR UPDATE
TO service_role
USING (true)
WITH CHECK (true);

-- Policy for delete (optional, usually not needed for activities)
-- CREATE POLICY "Allow service role to delete pod activities"
-- ON public.pod_activities FOR DELETE
-- TO service_role
-- USING (true);
