-- Treningsmerker: manuelle registreringer fra range, chipping-green og
-- putting-green, pluss trenerens merker.
--
-- Merkene («golfbagen») regnes ut i appen fra disse radene — ingenting
-- «oppnådd» lagres. Samme modell som runder: insert for nye rader, update
-- bare for myk sletting (angre), og tilgang via player_access/konto.

create table if not exists public.training_entries (
  id          uuid primary key,
  player_id   uuid not null references public.players(id) on delete cascade,
  kind        text not null check (kind in ('attempt', 'coach')),
  badge_id    text not null check (char_length(badge_id) <= 32),
  step        smallint check (step between 1 and 7),
  outcome     text check (outcome in ('hit', 'miss', 'holed')),
  value_m     real check (value_m > 0 and value_m <= 500),
  reference_m real check (reference_m > 0 and reference_m <= 500),
  series_id   text check (char_length(series_id) <= 64),
  award       text check (award in ('innsats', 'lagkamerat', 'mot', 'fremgang')),
  note        text check (char_length(note) <= 140),
  created_at  timestamptz not null default now(),
  deleted     boolean not null default false
);

create index if not exists idx_training_entries_player
  on public.training_entries(player_id, created_at);

alter table public.training_entries enable row level security;

-- Samme tilgangsregel som runder: eier, konto-medlemmer eller delt tilgang.
drop policy if exists training_select on public.training_entries;
create policy training_select on public.training_entries for select using (
  player_id in (
    select id from public.players
    where owner = auth.uid() or owner in (select public.account_uids())
  )
  or player_id in (select player_id from public.player_access where uid = auth.uid())
);

drop policy if exists training_insert on public.training_entries;
create policy training_insert on public.training_entries for insert with check (
  player_id in (
    select id from public.players
    where owner = auth.uid() or owner in (select public.account_uids())
  )
  or player_id in (select player_id from public.player_access where uid = auth.uid())
);

-- Update brukes bare til myk sletting (deleted = true) når man angrer.
drop policy if exists training_update on public.training_entries;
create policy training_update on public.training_entries for update using (
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
