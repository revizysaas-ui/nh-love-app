-- Migration: Photos sensibles avec code PIN
-- Exécuter dans Supabase SQL Editor

-- 1. Colonnes sensitive sur la table photos
ALTER TABLE photos ADD COLUMN IF NOT EXISTS sensitive BOOLEAN DEFAULT false;
ALTER TABLE photos ADD COLUMN IF NOT EXISTS sensitive_emoji TEXT DEFAULT '🎂';
ALTER TABLE photos ADD COLUMN IF NOT EXISTS sensitive_code TEXT DEFAULT NULL;
