-- Migration: Add full_name column to users table
-- Project: Bravo revOS (kvjcidxbyimoswntpjcp)
-- SQL Editor: https://supabase.com/dashboard/project/kvjcidxbyimoswntpjcp/sql/new

-- Add full_name column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS full_name TEXT;

-- Update existing user (rodericandrews@gmail.com) with full name
UPDATE users
SET full_name = 'Roderic Andrews'
WHERE email = 'rodericandrews@gmail.com' AND full_name IS NULL;
