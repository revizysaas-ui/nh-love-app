-- ============================================
-- FIX DÉFINITIF: restaure toutes les policies ouvertes
-- + ajoute les nouvelles tables/colonnes
-- Exécuter dans Supabase SQL Editor
-- ============================================

-- 1. room_sessions
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

-- 3. RESTAURE policies ouvertes sur TOUTES les tables
-- (au cas où la migration précédente les a supprimées)

-- rooms
DROP POLICY IF EXISTS "Open rooms" ON rooms;
DROP POLICY IF EXISTS "Read rooms" ON rooms;
DROP POLICY IF EXISTS "Update rooms" ON rooms;
DROP POLICY IF EXISTS "Insert rooms" ON rooms;
DROP POLICY IF EXISTS "Public rooms" ON rooms;
CREATE POLICY "Public rooms" ON rooms FOR ALL USING (true) WITH CHECK (true);

-- messages
DROP POLICY IF EXISTS "Strict messages" ON messages;
DROP POLICY IF EXISTS "Public messages" ON messages;
CREATE POLICY "Public messages" ON messages FOR ALL USING (true) WITH CHECK (true);

-- photos
DROP POLICY IF EXISTS "Strict photos" ON photos;
DROP POLICY IF EXISTS "Public photos" ON photos;
CREATE POLICY "Public photos" ON photos FOR ALL USING (true) WITH CHECK (true);

-- reactions
DROP POLICY IF EXISTS "Strict reactions" ON reactions;
DROP POLICY IF EXISTS "Public reactions" ON reactions;
CREATE POLICY "Public reactions" ON reactions FOR ALL USING (true) WITH CHECK (true);

-- photo_comments
DROP POLICY IF EXISTS "Strict photo_comments" ON photo_comments;
DROP POLICY IF EXISTS "Public photo_comments" ON photo_comments;
CREATE POLICY "Public photo_comments" ON photo_comments FOR ALL USING (true) WITH CHECK (true);

-- notifications
DROP POLICY IF EXISTS "Strict notifications" ON notifications;
DROP POLICY IF EXISTS "Public notifications" ON notifications;
CREATE POLICY "Public notifications" ON notifications FOR ALL USING (true) WITH CHECK (true);

-- drawings
DROP POLICY IF EXISTS "Strict drawings" ON drawings;
DROP POLICY IF EXISTS "Public drawings" ON drawings;
CREATE POLICY "Public drawings" ON drawings FOR ALL USING (true) WITH CHECK (true);

-- quiz_sessions
DROP POLICY IF EXISTS "Strict quiz_sessions" ON quiz_sessions;
DROP POLICY IF EXISTS "Public quiz_sessions" ON quiz_sessions;
CREATE POLICY "Public quiz_sessions" ON quiz_sessions FOR ALL USING (true) WITH CHECK (true);

-- daily_answers
DROP POLICY IF EXISTS "Strict daily_answers" ON daily_answers;
DROP POLICY IF EXISTS "Public daily_answers" ON daily_answers;
CREATE POLICY "Public daily_answers" ON daily_answers FOR ALL USING (true) WITH CHECK (true);

-- wishlist
DROP POLICY IF EXISTS "Strict wishlist" ON wishlist;
DROP POLICY IF EXISTS "Public wishlist" ON wishlist;
CREATE POLICY "Public wishlist" ON wishlist FOR ALL USING (true) WITH CHECK (true);

-- counters
DROP POLICY IF EXISTS "Strict counters" ON counters;
DROP POLICY IF EXISTS "Public counters" ON counters;
CREATE POLICY "Public counters" ON counters FOR ALL USING (true) WITH CHECK (true);

-- playlist
DROP POLICY IF EXISTS "Strict playlist" ON playlist;
DROP POLICY IF EXISTS "Public playlist" ON playlist;
CREATE POLICY "Public playlist" ON playlist FOR ALL USING (true) WITH CHECK (true);

-- questions
DROP POLICY IF EXISTS "Strict questions" ON questions;
DROP POLICY IF EXISTS "Read questions" ON questions;
DROP POLICY IF EXISTS "Public questions" ON questions;
CREATE POLICY "Public questions" ON questions FOR ALL USING (true) WITH CHECK (true);

-- storage
DROP POLICY IF EXISTS "Auth read photos" ON storage.objects;
DROP POLICY IF EXISTS "Auth upload photos" ON storage.objects;
DROP POLICY IF EXISTS "Auth delete photos" ON storage.objects;
DROP POLICY IF EXISTS "Public photos" ON storage.objects;
CREATE POLICY "Public photos" ON storage.objects FOR ALL USING (true) WITH CHECK (true);
