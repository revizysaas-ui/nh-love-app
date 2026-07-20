-- Migration: Add app_lock column to rooms table
-- This stores the SHA-256 hash of the 4-digit app lock PIN
-- Both partners share the same PIN (synced via this column)

ALTER TABLE rooms ADD COLUMN IF NOT EXISTS app_lock text DEFAULT NULL;

-- Verify
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'rooms' AND column_name = 'app_lock';
