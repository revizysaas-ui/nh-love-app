-- Ajouter colonne active_game pour indiquer le jeu en cours
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS active_game jsonb DEFAULT NULL;

-- Vérifier
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'rooms' AND column_name = 'active_game';
