-- Rydd vekk testdata (spillerne «Emma» og «Noah» fra utviklingsfasen).
-- Kjør dette SELV i Supabase: Dashboard → SQL Editor → New query → Run.
-- (SQL Editor kjører som eier og er ikke begrenset av RLS, så sletting går fint.)
-- Runder slettes automatisk via «on delete cascade» på rounds.player_id.
--
-- Behold ekte spillere (f.eks. «Dina»). Juster lista ved behov.

delete from public.players
where name in ('Emma', 'Noah', '_probe', '_test');

-- («_probe» ble laget for å verifisere at RLS blokkerer skriving for
--  anon-nøkkelen; «_test» ble brukt til å verifisere feiringsskjermen.
--  Begge er trygge å slette.)
