-- START PÅ NYTT: slett ALL spillerdata (alle spillere + alle runder).
-- Kjør SELV i Supabase: Dashboard → SQL Editor → New query → lim inn → Run.
-- (SQL Editor kjører som eier og er ikke begrenset av RLS.)
--
-- ⚠️  VIKTIG: Tøm også lokale data på HVER enhet som har brukt appen FØR du
--     åpner den igjen. Appen er offline-først og vil ellers laste opp den
--     lokale kopien på nytt, og dataene kommer tilbake. Se README / be om
--     «Start på nytt»-knappen i appen.

delete from public.rounds;
delete from public.players;
