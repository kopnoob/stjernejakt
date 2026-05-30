-- Behold KUN den sist opprettede spilleren (Caroline, opprettet 30. mai 09:50),
-- og slett alle andre spillere. Runder til de slettede spillerne fjernes
-- automatisk via «on delete cascade» på rounds.player_id.
--
-- Kjør SELV i Supabase: Dashboard → SQL Editor → New query → lim inn → Run.
--
-- (Merk: dette fjerner også den ANDRE Caroline som ble laget 09:49.)

delete from public.players
where id <> '89639cf0-dbe6-4435-915d-ee6bbf5ebadf';

-- Verifiser etterpå (skal vise kun én rad – Caroline):
--   select id, name, created_at from public.players;
