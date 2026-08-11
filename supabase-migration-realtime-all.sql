-- Migration Realtime : ajoute toutes les tables de l'app à la publication Realtime
-- À exécuter dans le Supabase SQL Editor (sûr à relancer, idempotent)
--
-- CRUCIAL pour les jeux en couple : la synchro passe par rooms.active_game,
-- et les notifications par la table notifications.

do
$do$
declare
  _t text;
begin
  for _t in
    select tablename from pg_tables
    where schemaname = 'public'
      and tablename = any(array[
        'rooms','messages','reactions','notifications','photos','photo_comments',
        'drawings','questions','quiz_sessions','game_morpion','daily_answers',
        'wishlist','counters','playlist','room_sessions','timeline','themes'
      ])
  loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = _t
    ) then
      execute format('alter publication supabase_realtime add table %I', _t);
    end if;
  end loop;
end
$do$;

-- Vérification : doit lister les tables de l'app
select tablename from pg_publication_tables
where pubname = 'supabase_realtime' and schemaname = 'public'
order by tablename;
