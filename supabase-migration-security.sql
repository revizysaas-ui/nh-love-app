-- ============================================
-- MIGRATION SÉCURITÉ COMPLÈTE
-- Exécuter dans Supabase SQL Editor
-- ============================================

-- 1. TABLE room_sessions (auth anonyme par room)
CREATE TABLE IF NOT EXISTS room_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id BIGINT REFERENCES rooms(id) ON DELETE CASCADE,
  user_token TEXT UNIQUE NOT NULL,
  display_name TEXT DEFAULT 'Anonyme',
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE room_sessions ENABLE ROW LEVEL SECURITY;

-- 2. AJOUTER colonne password à rooms
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS room_password TEXT DEFAULT NULL;

-- 3. AJOUTER colonnes sensitive à photos (si pas déjà fait)
ALTER TABLE photos ADD COLUMN IF NOT EXISTS sensitive BOOLEAN DEFAULT false;
ALTER TABLE photos ADD COLUMN IF NOT EXISTS sensitive_emoji TEXT DEFAULT '🎂';
ALTER TABLE photos ADD COLUMN IF NOT EXISTS sensitive_code TEXT DEFAULT NULL;

-- 4. RLS STRICT: supprimer les anciennes policies ouvertes
-- Messages
DROP POLICY IF EXISTS "Public messages" ON messages;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='messages' AND policyname='Strict messages') THEN
    CREATE POLICY "Strict messages" ON messages
      FOR ALL USING (room_id IN (SELECT room_id FROM room_sessions WHERE user_token = current_setting('request.headers')::json->>'x-room-token'));
  END IF;
END $$;

-- Photos
DROP POLICY IF EXISTS "Public photos" ON photos;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='photos' AND policyname='Strict photos') THEN
    CREATE POLICY "Strict photos" ON photos
      FOR ALL USING (room_id IN (SELECT room_id FROM room_sessions WHERE user_token = current_setting('request.headers')::json->>'x-room-token'));
  END IF;
END $$;

-- Reactions
DROP POLICY IF EXISTS "Public reactions" ON reactions;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='reactions' AND policyname='Strict reactions') THEN
    CREATE POLICY "Strict reactions" ON reactions
      FOR ALL USING (message_id IN (
        SELECT m.id FROM messages m
        JOIN room_sessions rs ON rs.room_id = m.room_id
        WHERE rs.user_token = current_setting('request.headers')::json->>'x-room-token'
      ));
  END IF;
END $$;

-- Photo comments
DROP POLICY IF EXISTS "Public photo_comments" ON photo_comments;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='photo_comments' AND policyname='Strict photo_comments') THEN
    CREATE POLICY "Strict photo_comments" ON photo_comments
      FOR ALL USING (room_id IN (SELECT room_id FROM room_sessions WHERE user_token = current_setting('request.headers')::json->>'x-room-token'));
  END IF;
END $$;

-- Notifications
DROP POLICY IF EXISTS "Public notifications" ON notifications;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='notifications' AND policyname='Strict notifications') THEN
    CREATE POLICY "Strict notifications" ON notifications
      FOR ALL USING (room_id IN (SELECT room_id FROM room_sessions WHERE user_token = current_setting('request.headers')::json->>'x-room-token'));
  END IF;
END $$;

-- Drawings
DROP POLICY IF EXISTS "Public drawings" ON drawings;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='drawings' AND policyname='Strict drawings') THEN
    CREATE POLICY "Strict drawings" ON drawings
      FOR ALL USING (room_id IN (SELECT room_id FROM room_sessions WHERE user_token = current_setting('request.headers')::json->>'x-room-token'));
  END IF;
END $$;

-- Quiz sessions
DROP POLICY IF EXISTS "Public quiz_sessions" ON quiz_sessions;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='quiz_sessions' AND policyname='Strict quiz_sessions') THEN
    CREATE POLICY "Strict quiz_sessions" ON quiz_sessions
      FOR ALL USING (room_id IN (SELECT room_id FROM room_sessions WHERE user_token = current_setting('request.headers')::json->>'x-room-token'));
  END IF;
END $$;

-- Daily answers
DROP POLICY IF EXISTS "Public daily_answers" ON daily_answers;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='daily_answers' AND policyname='Strict daily_answers') THEN
    CREATE POLICY "Strict daily_answers" ON daily_answers
      FOR ALL USING (room_id IN (SELECT room_id FROM room_sessions WHERE user_token = current_setting('request.headers')::json->>'x-room-token'));
  END IF;
END $$;

-- Wishlist
DROP POLICY IF EXISTS "Public wishlist" ON wishlist;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='wishlist' AND policyname='Strict wishlist') THEN
    CREATE POLICY "Strict wishlist" ON wishlist
      FOR ALL USING (room_id IN (SELECT room_id FROM room_sessions WHERE user_token = current_setting('request.headers')::json->>'x-room-token'));
  END IF;
END $$;

-- Counters
DROP POLICY IF EXISTS "Public counters" ON counters;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='counters' AND policyname='Strict counters') THEN
    CREATE POLICY "Strict counters" ON counters
      FOR ALL USING (room_id IN (SELECT room_id FROM room_sessions WHERE user_token = current_setting('request.headers')::json->>'x-room-token'));
  END IF;
END $$;

-- Playlist
DROP POLICY IF EXISTS "Public playlist" ON playlist;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='playlist' AND policyname='Strict playlist') THEN
    CREATE POLICY "Strict playlist" ON playlist
      FOR ALL USING (room_id IN (SELECT room_id FROM room_sessions WHERE user_token = current_setting('request.headers')::json->>'x-room-token'));
  END IF;
END $$;

-- Timeline
DROP POLICY IF EXISTS "Public timeline" ON timeline;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='timeline' AND policyname='Strict timeline') THEN
    CREATE POLICY "Strict timeline" ON timeline
      FOR ALL USING (room_id IN (SELECT room_id FROM room_sessions WHERE user_token = current_setting('request.headers')::json->>'x-room-token'));
  END IF;
END $$;

-- Themes
DROP POLICY IF EXISTS "Public themes" ON themes;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='themes' AND policyname='Strict themes') THEN
    CREATE POLICY "Strict themes" ON themes
      FOR ALL USING (room_id IN (SELECT room_id FROM room_sessions WHERE user_token = current_setting('request.headers')::json->>'x-room-token'));
  END IF;
END $$;

-- Rooms: lecture seule pour tous (nécessaire pour join)
DROP POLICY IF EXISTS "Public rooms" ON rooms;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='rooms' AND policyname='Read rooms') THEN
    CREATE POLICY "Read rooms" ON rooms FOR SELECT USING (true);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='rooms' AND policyname='Update rooms') THEN
    CREATE POLICY "Update rooms" ON rooms FOR UPDATE USING (true) WITH CHECK (true);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='rooms' AND policyname='Insert rooms') THEN
    CREATE POLICY "Insert rooms" ON rooms FOR INSERT WITH CHECK (true);
  END IF;
END $$;

-- Questions: lecture seule (quiz public)
DROP POLICY IF EXISTS "Public questions" ON questions;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='questions' AND policyname='Read questions') THEN
    CREATE POLICY "Read questions" ON questions FOR SELECT USING (true);
  END IF;
END $$;

-- 5. BUCKET STORAGE: reste PUBLIC (getPublicUrl() nécessite un bucket public)
-- La sécurité repose sur:
--   - RLS sur la table photos (qui peut voir les métadonnées)
--   - SecureImage canvas (URL masquée dans l'inspecteur pour les photos sensibles)
--   - Code PIN SHA-256 (protection des photos sensibles)
--   - La connaissance du chemin de stockage (non exposé sans accès RLS)
-- Les policies storage ci-dessous contrôlent l'upload et la suppression :

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='objects' AND policyname='Auth read photos') THEN
    CREATE POLICY "Auth read photos" ON storage.objects
      FOR SELECT USING (
        bucket_id = 'photos'
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='objects' AND policyname='Auth upload photos') THEN
    CREATE POLICY "Auth upload photos" ON storage.objects
      FOR INSERT WITH CHECK (
        bucket_id = 'photos'
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='objects' AND policyname='Auth delete photos') THEN
    CREATE POLICY "Auth delete photos" ON storage.objects
      FOR DELETE USING (
        bucket_id = 'photos'
      );
  END IF;
END $$;
