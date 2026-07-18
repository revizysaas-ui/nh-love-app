-- ============================================
-- FIX: ajouter uniquement les colonnes/tables manquantes
-- NE touche PAS aux policies existantes
-- Exécuter dans Supabase SQL Editor
-- ============================================

-- Table room_sessions (si pas encore créée)
CREATE TABLE IF NOT EXISTS room_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id BIGINT REFERENCES rooms(id) ON DELETE CASCADE,
  user_token TEXT UNIQUE NOT NULL,
  display_name TEXT DEFAULT 'Anonyme',
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE room_sessions ENABLE ROW LEVEL SECURITY;

-- Policy permissive sur room_sessions
DROP POLICY IF EXISTS "Public room_sessions" ON room_sessions;
CREATE POLICY "Public room_sessions" ON room_sessions
  FOR ALL USING (true) WITH CHECK (true);

-- Colonne password sur rooms
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS room_password TEXT DEFAULT NULL;

-- Colonnes sensitive sur photos
ALTER TABLE photos ADD COLUMN IF NOT EXISTS sensitive BOOLEAN DEFAULT false;
ALTER TABLE photos ADD COLUMN IF NOT EXISTS sensitive_emoji TEXT DEFAULT '🎂';
ALTER TABLE photos ADD COLUMN IF NOT EXISTS sensitive_code TEXT DEFAULT NULL;
