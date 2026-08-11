-- Migration : fond personnalisé de la messagerie
-- À exécuter dans le Supabase SQL Editor

ALTER TABLE rooms ADD COLUMN IF NOT EXISTS chat_bg TEXT DEFAULT NULL;
