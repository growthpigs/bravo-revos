-- Add agency_id to users table for direct agency association
-- This allows users to be associated with an agency, which is useful for admin operations
ALTER TABLE users ADD COLUMN agency_id UUID REFERENCES agencies(id) ON DELETE SET NULL;

-- Create index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_users_agency ON users(agency_id);

-- For existing users, derive agency_id from their client if they have one
UPDATE users
SET agency_id = clients.agency_id
FROM clients
WHERE users.client_id = clients.id AND users.agency_id IS NULL;
