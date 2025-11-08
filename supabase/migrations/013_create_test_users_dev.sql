-- Create test users and clients for development mode LinkedIn testing
-- This migration is safe to run in production - the test data won't be used without explicit configuration

BEGIN;

-- Create test client (if not exists)
INSERT INTO clients (id, name, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000002'::uuid,
  'Test Client',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

-- Create test user (if not exists)
INSERT INTO users (id, email, client_id, role, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000003'::uuid,
  'dev@test.local',
  '00000000-0000-0000-0000-000000000002'::uuid,
  'member',
  NOW(),
  NOW()
)
ON CONFLICT (email) DO NOTHING;

COMMIT;

-- Migration info:
-- Development test user ID: 00000000-0000-0000-0000-000000000003
-- Test client ID: 00000000-0000-0000-0000-000000000002
