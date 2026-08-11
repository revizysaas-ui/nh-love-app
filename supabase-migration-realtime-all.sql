-- Migration Realtime : ajoute TOUTES les tables de l'app à la publication Realtime
-- À exécuter dans le Supabase SQL Editor (sûr à relancer, idempotent)
--
-- C'est CRUCIAL pour les jeux en couple : la synchro passe par rooms.active_game,
-- et les notifications par la table notifications.

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename IN (
        'rooms','messages','reactions','notifications','photos','photo_comments',
        'drawings','questions','quiz_sessions','game_morpion','daily_answers',
        'wishlist','counters','playlist','room_sessions','timeline','themes'
      )
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = tbl
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE %I', tbl);
    END IF;
  END LOOP;
END $$;

-- Vérification (doit lister toutes les tables de l'app)
SELECT tablename FROM pg_publication_tables
WHERE pubname = 'supabase_realtime' AND schemaname = 'public'
ORDER BY tablename;
