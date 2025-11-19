-- RPC function to safely get invitation by token
-- Handles UUID type casting for token matching
CREATE OR REPLACE FUNCTION get_invitation_by_token(p_token TEXT)
RETURNS TABLE (
  id UUID,
  invitation_token TEXT,
  email TEXT,
  first_name TEXT,
  last_name TEXT,
  role TEXT,
  pod_id UUID,
  status TEXT,
  created_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ui.id,
    ui.invitation_token,
    ui.email,
    ui.first_name,
    ui.last_name,
    ui.role,
    ui.pod_id,
    ui.status,
    ui.created_at,
    ui.expires_at
  FROM user_invitations ui
  WHERE ui.invitation_token = p_token;
END;
$$ LANGUAGE plpgsql STABLE;
