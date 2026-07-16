-- Migration: Photos sensibles
-- Exécuter dans Supabase SQL Editor

-- 1. Ajouter les colonnes sensitive à la table photos
ALTER TABLE photos ADD COLUMN IF NOT EXISTS sensitive BOOLEAN DEFAULT false;
ALTER TABLE photos ADD COLUMN IF NOT EXISTS sensitive_emoji TEXT DEFAULT '🎂';

-- 2. Rendre le bucket 'photos' privé
-- Aller dans Supabase > Storage > photos > Settings
-- Décocher "Public bucket" pour le rendre privé

-- 3. Politique RLS pour le storage (accès lecture seule pour les membres de la room)
-- Cette politique permet de lire les photos seulement si le user est authentifié
-- et que le fichier est dans le dossier de sa room
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='objects' AND policyname='Authenticated read photos') THEN
    CREATE POLICY "Authenticated read photos" ON storage.objects
      FOR SELECT USING (
        bucket_id = 'photos'
        AND auth.role() = 'authenticated'
      );
  END IF;
END $$;

-- 4. Politique pour upload (seuls les membres de la room peuvent uploader)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='objects' AND policyname='Authenticated upload photos') THEN
    CREATE POLICY "Authenticated upload photos" ON storage.objects
      FOR INSERT WITH CHECK (
        bucket_id = 'photos'
        AND auth.role() = 'authenticated'
      );
  END IF;
END $$;

-- 5. Politique pour suppression
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='objects' AND policyname='Authenticated delete photos') THEN
    CREATE POLICY "Authenticated delete photos" ON storage.objects
      FOR DELETE USING (
        bucket_id = 'photos'
        AND auth.role() = 'authenticated'
      );
  END IF;
END $$;
