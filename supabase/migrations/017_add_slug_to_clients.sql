-- Add slug column to clients table for URL-friendly identifiers
ALTER TABLE clients ADD COLUMN slug TEXT;

-- Create unique index for slug within agency (agency can have multiple clients with different slugs)
CREATE UNIQUE INDEX IF NOT EXISTS idx_clients_agency_slug ON clients(agency_id, slug);

-- For existing clients, generate slug from name if not set
UPDATE clients SET slug = LOWER(REGEXP_REPLACE(name, '[^a-zA-Z0-9]+', '-', 'g')) WHERE slug IS NULL;

-- Make slug NOT NULL after backfill
ALTER TABLE clients ALTER COLUMN slug SET NOT NULL;
