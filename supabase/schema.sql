-- Stjernejakt Mobil — Supabase-skjema
-- Kjør dette i Supabase: SQL Editor → New query → lim inn → Run.

-- ── Spillere ──────────────────────────────────────────────────────────────
create table if not exists public.players (
  id          uuid primary key,
  name        text not null,
  color       text not null default '#1f6b43',
  avatar      text,                       -- valgfri emoji-figur barnet velger
  current_hcp int not null default 5,     -- utgått: nå lokal enhets-preferanse
  created_at  timestamptz not null default now()
);

-- ── Runder ────────────────────────────────────────────────────────────────
create table if not exists public.rounds (
  id            uuid primary key,
  player_id     uuid not null references public.players(id) on delete cascade,
  hcp           int not null,
  distance      int not null,
  star          text not null,            -- none | bronze | silver | gold
  holed_count   int not null default 0,
  total_strokes int not null default 0,
  holes         jsonb not null default '[]'::jsonb,
  created_at    timestamptz not null default now()
);

create index if not exists idx_rounds_player on public.rounds(player_id);
create index if not exists idx_rounds_hcp_dist on public.rounds(hcp, distance);

-- ── Verdiområde-sjekker (F5) ────────────────────────────────────────────────
alter table public.rounds
  add constraint rounds_hcp_chk      check (hcp between 1 and 12)             not valid;
alter table public.rounds
  add constraint rounds_distance_chk check (distance between 1 and 300)       not valid;
alter table public.rounds
  add constraint rounds_strokes_chk  check (total_strokes between 0 and 200)  not valid;
alter table public.rounds
  add constraint rounds_holed_chk    check (holed_count between 0 and 3)      not valid;
alter table public.rounds
  add constraint rounds_star_chk     check (star in ('none','bronze','silver','gold')) not valid;

-- ── Row Level Security (E1) ─────────────────────────────────────────────────
-- Privat familie-app uten innlogging. Anon-nøkkelen er offentlig (og repoet
-- er åpent), så vi tillater BARE lesing + innsetting. Datamodellen er
-- insert-only: rader endres aldri, og sletting er en lokal tombstone på
-- enheten. Dermed trengs verken update- eller delete-tilgang for anon.
alter table public.players enable row level security;
alter table public.rounds  enable row level security;

drop policy if exists "players_all" on public.players;
drop policy if exists "rounds_all"  on public.rounds;

create policy "players_select" on public.players for select using (true);
create policy "players_insert" on public.players for insert with check (true);
create policy "rounds_select"  on public.rounds  for select using (true);
create policy "rounds_insert"  on public.rounds  for insert with check (true);
-- Ingen update/delete-policy ⇒ anon kan verken endre eller slette rader.
