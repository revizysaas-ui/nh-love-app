-- ============================================
-- MIGRATION SÉCURITÉ v3 - RLS STRICT
-- Exécuter dans Supabase SQL Editor
-- ============================================

-- 1. room_sessions (si pas encore là)
CREATE TABLE IF NOT EXISTS room_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id BIGINT REFERENCES rooms(id) ON DELETE CASCADE,
  user_token TEXT UNIQUE NOT NULL,
  display_name TEXT DEFAULT 'Anonyme',
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE room_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public room_sessions" ON room_sessions;
CREATE POLICY "Public room_sessions" ON room_sessions FOR ALL USING (true) WITH CHECK (true);

-- 2. Colonnes manquantes
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS room_password TEXT DEFAULT NULL;
ALTER TABLE photos ADD COLUMN IF NOT EXISTS sensitive BOOLEAN DEFAULT false;
ALTER TABLE photos ADD COLUMN IF NOT EXISTS sensitive_emoji TEXT DEFAULT '🎂';
ALTER TABLE photos ADD COLUMN IF NOT EXISTS sensitive_code TEXT DEFAULT NULL;

-- 3. HELPER: extraire le token du header de manière sûre
-- current_setting(..., true) retourne NULL au lieu de crasher si le setting n'existe pas
-- COALESCE garantit un résultat non-null

-- 4. Rooms: POLITIQUE OUVERTE (indispensable pour join + création)
DROP POLICY IF EXISTS "Public rooms" ON rooms;
DROP POLICY IF EXISTS "Open rooms" ON rooms;
DROP POLICY IF EXISTS "Read rooms" ON rooms;
DROP POLICY IF EXISTS "Update rooms" ON rooms;
DROP POLICY IF EXISTS "Insert rooms" ON rooms;
CREATE POLICY "Public rooms" ON rooms FOR ALL USING (true) WITH CHECK (true);

-- 5. RLS STRICT: chaque table vérifie que le token appartient à la room

-- Messages
DROP POLICY IF EXISTS "Public messages" ON messages;
DROP POLICY IF EXISTS "Strict messages" ON messages;
CREATE POLICY "Strict messages" ON messages FOR ALL
  USING (room_id IN (
    SELECT rs.room_id FROM room_sessions rs
    WHERE rs.user_token = COALESCE(current_setting('request.headers', true)::text::json->>'x-room-token', '')
  ));

-- Photos
DROP POLICY IF EXISTS "Public photos" ON photos;
DROP POLICY IF EXISTS "Strict photos" ON photos;
CREATE POLICY "Strict photos" ON photos FOR ALL
  USING (room_id IN (
    SELECT rs.room_id FROM room_sessions rs
    WHERE rs.user_token = COALESCE(current_setting('request.headers', true)::text::json->>'x-room-token', '')
  ));

-- Reactions
DROP POLICY IF EXISTS "Public reactions" ON reactions;
DROP POLICY IF EXISTS "Strict reactions" ON reactions;
CREATE POLICY "Strict reactions" ON reactions FOR ALL
  USING (message_id IN (
    SELECT m.id FROM messages m
    JOIN room_sessions rs ON rs.room_id = m.room_id
    WHERE rs.user_token = COALESCE(current_setting('request.headers', true)::text::json->>'x-room-token', '')
  ));

-- Photo comments
DROP POLICY IF EXISTS "Public photo_comments" ON photo_comments;
DROP POLICY IF EXISTS "Strict photo_comments" ON photo_comments;
CREATE POLICY "Strict photo_comments" ON photo_comments FOR ALL
  USING (room_id IN (
    SELECT rs.room_id FROM room_sessions rs
    WHERE rs.user_token = COALESCE(current_setting('request.headers', true)::text::json->>'x-room-token', '')
  ));

-- Notifications
DROP POLICY IF EXISTS "Public notifications" ON notifications;
DROP POLICY IF EXISTS "Strict notifications" ON notifications;
CREATE POLICY "Strict notifications" ON notifications FOR ALL
  USING (room_id IN (
    SELECT rs.room_id FROM room_sessions rs
    WHERE rs.user_token = COALESCE(current_setting('request.headers', true)::text::json->>'x-room-token', '')
  ));

-- Drawings
DROP POLICY IF EXISTS "Public drawings" ON drawings;
DROP POLICY IF EXISTS "Strict drawings" ON drawings;
CREATE POLICY "Strict drawings" ON drawings FOR ALL
  USING (room_id IN (
    SELECT rs.room_id FROM room_sessions rs
    WHERE rs.user_token = COALESCE(current_setting('request.headers', true)::text::json->>'x-room-token', '')
  ));

-- Quiz sessions
DROP POLICY IF EXISTS "Public quiz_sessions" ON quiz_sessions;
DROP POLICY IF EXISTS "Strict quiz_sessions" ON quiz_sessions;
CREATE POLICY "Strict quiz_sessions" ON quiz_sessions FOR ALL
  USING (room_id IN (
    SELECT rs.room_id FROM room_sessions rs
    WHERE rs.user_token = COALESCE(current_setting('request.headers', true)::text::json->>'x-room-token', '')
  ));

-- Daily answers
DROP POLICY IF EXISTS "Public daily_answers" ON daily_answers;
DROP POLICY IF EXISTS "Strict daily_answers" ON daily_answers;
CREATE POLICY "Strict daily_answers" ON daily_answers FOR ALL
  USING (room_id IN (
    SELECT rs.room_id FROM room_sessions rs
    WHERE rs.user_token = COALESCE(current_setting('request.headers', true)::text::json->>'x-room-token', '')
  ));

-- Wishlist
DROP POLICY IF EXISTS "Public wishlist" ON wishlist;
DROP POLICY IF EXISTS "Strict wishlist" ON wishlist;
CREATE POLICY "Strict wishlist" ON wishlist FOR ALL
  USING (room_id IN (
    SELECT rs.room_id FROM room_sessions rs
    WHERE rs.user_token = COALESCE(current_setting('request.headers', true)::text::json->>'x-room-token', '')
  ));

-- Counters
DROP POLICY IF EXISTS "Public counters" ON counters;
DROP POLICY IF EXISTS "Strict counters" ON counters;
CREATE POLICY "Strict counters" ON counters FOR ALL
  USING (room_id IN (
    SELECT rs.room_id FROM room_sessions rs
    WHERE rs.user_token = COALESCE(current_setting('request.headers', true)::text::json->>'x-room-token', '')
  ));

-- Playlist
DROP POLICY IF EXISTS "Public playlist" ON playlist;
DROP POLICY IF EXISTS "Strict playlist" ON playlist;
CREATE POLICY "Strict playlist" ON playlist FOR ALL
  USING (room_id IN (
    SELECT rs.room_id FROM room_sessions rs
    WHERE rs.user_token = COALESCE(current_setting('request.headers', true)::text::json->>'x-room-token', '')
  ));

-- Questions (quiz public, lecture seule)
DROP POLICY IF EXISTS "Public questions" ON questions;
DROP POLICY IF EXISTS "Read questions" ON questions;
CREATE POLICY "Public questions" ON questions FOR SELECT USING (true);

-- Storage: lecture/upload/delete ouvert (bucket public)
DROP POLICY IF EXISTS "Auth read photos" ON storage.objects;
DROP POLICY IF EXISTS "Auth upload photos" ON storage.objects;
DROP POLICY IF EXISTS "Auth delete photos" ON storage.objects;
DROP POLICY IF EXISTS "Public photos" ON storage.objects;
CREATE POLICY "Public photos" ON storage.objects FOR ALL USING (true) WITH CHECK (true);
