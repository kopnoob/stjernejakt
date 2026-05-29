-- Stjernejakt Mobil — Supabase-skjema
-- Kjør dette i Supabase: SQL Editor → New query → lim inn → Run.

-- ── Spillere ──────────────────────────────────────────────────────────────
create table if not exists public.players (
  id          uuid primary key,
  name        text not null,
  color       text not null default '#1f6b43',
  current_hcp int not null default 5,
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

-- ── Row Level Security ──────────────────────────────────────────────────────
-- Dette er en privat familie-app uten innlogging. Anon-nøkkelen er offentlig,
-- så vi åpner for full tilgang med anon. Vil du låse den ned senere, bytt
-- til auth-baserte policies.
alter table public.players enable row level security;
alter table public.rounds  enable row level security;

drop policy if exists "players_all" on public.players;
create policy "players_all" on public.players
  for all using (true) with check (true);

drop policy if exists "rounds_all" on public.rounds;
create policy "rounds_all" on public.rounds
  for all using (true) with check (true);
