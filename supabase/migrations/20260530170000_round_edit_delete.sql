-- Rediger/slett sesjon fra historikk.
--
-- Myk sletting (deleted-flagg) i stedet for hard delete: tombstonen
-- propagerer til andre enheter uten re-push-problem, og insert-only-modellen
-- for NYE runder beholdes. Rediger = update av feltene.

alter table public.rounds add column if not exists deleted boolean not null default false;

-- Update-tilgang for runder til spillere du har tilgang til (begge foreldre).
drop policy if exists rounds_update on public.rounds;
create policy rounds_update on public.rounds for update using (
  player_id in (
    select id from public.players
    where owner = auth.uid() or owner in (select public.account_uids())
  )
  or player_id in (select player_id from public.player_access where uid = auth.uid())
) with check (
  player_id in (
    select id from public.players
    where owner = auth.uid() or owner in (select public.account_uids())
  )
  or player_id in (select player_id from public.player_access where uid = auth.uid())
);
