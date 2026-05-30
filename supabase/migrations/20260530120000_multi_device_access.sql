-- Multi-enhet uten innlogging.
--
-- Hver enhet får en anonym Supabase-identitet (auth.uid()) — ingen
-- innloggingsskjerm. Spillere eies av identiteten som lager dem, og tilgang
-- styres av player_access. Du ser bare spillere du har tilgang til.
--
--  • Deling: player_shares + claim_share(token) gir en annen enhet tilgang.
--  • Gjenoppretting: profiles.recovery_hash + recover(code) knytter en ny
--    enhet til «kontoen» og gir tilbake alle spillerne.
--
-- pgcrypto (digest) ligger i schema `extensions` på Supabase.
create extension if not exists pgcrypto with schema extensions;

-- ── Profiler (én pr anonym identitet; recovery_hash = «konto») ──────────────
create table if not exists public.profiles (
  uid           uuid primary key,
  recovery_hash text not null,
  created_at    timestamptz not null default now()
);

-- ── Eierskap på spiller ─────────────────────────────────────────────────────
alter table public.players add column if not exists owner uuid;
alter table public.players alter column owner set default auth.uid();

-- ── Tilgang: hvem ser/kan skrive til en spiller ────────────────────────────
create table if not exists public.player_access (
  player_id  uuid not null references public.players(id) on delete cascade,
  uid        uuid not null,
  created_at timestamptz not null default now(),
  primary key (player_id, uid)
);
create index if not exists idx_player_access_uid on public.player_access(uid);

-- ── Delingslenker ───────────────────────────────────────────────────────────
create table if not exists public.player_shares (
  token      text primary key,
  player_id  uuid not null references public.players(id) on delete cascade,
  created_by uuid,
  created_at timestamptz not null default now()
);

-- ── Trigger: eier får tilgang automatisk når en spiller opprettes ──────────
create or replace function public.grant_owner_access() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.owner is not null then
    insert into public.player_access(player_id, uid) values (new.id, new.owner)
      on conflict do nothing;
  end if;
  return new;
end; $$;

drop trigger if exists trg_grant_owner_access on public.players;
create trigger trg_grant_owner_access after insert on public.players
  for each row execute function public.grant_owner_access();

-- ── Funksjoner (SECURITY DEFINER) ──────────────────────────────────────────

-- Opprett profil — lagrer kun HASH av gjenopprettingskoden.
create or replace function public.init_profile(p_code text) returns void
language plpgsql security definer set search_path = public, extensions as $$
begin
  insert into public.profiles(uid, recovery_hash)
    values (auth.uid(), encode(digest(p_code, 'sha256'), 'hex'))
    on conflict (uid) do nothing;
end; $$;

-- Krev en delingslenke → gir kallende enhet tilgang til spilleren.
create or replace function public.claim_share(p_token text) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_player uuid;
begin
  select player_id into v_player from public.player_shares where token = p_token;
  if v_player is null then return null; end if;
  insert into public.player_access(player_id, uid) values (v_player, auth.uid())
    on conflict do nothing;
  return v_player;
end; $$;

-- Gjenopprett → knytt denne enheten til kontoen koden tilhører, og få tilgang
-- til alle spillere konto-medlemmene har tilgang til.
create or replace function public.recover(p_code text) returns int
language plpgsql security definer set search_path = public, extensions as $$
declare v_hash text; v_count int;
begin
  v_hash := encode(digest(p_code, 'sha256'), 'hex');
  if not exists (select 1 from public.profiles where recovery_hash = v_hash) then
    return -1; -- ukjent kode
  end if;
  insert into public.profiles(uid, recovery_hash) values (auth.uid(), v_hash)
    on conflict (uid) do update set recovery_hash = excluded.recovery_hash;
  insert into public.player_access(player_id, uid)
    select distinct pa.player_id, auth.uid()
    from public.player_access pa
    join public.profiles pr on pr.uid = pa.uid
    where pr.recovery_hash = v_hash
    on conflict do nothing;
  get diagnostics v_count = row_count;
  return v_count;
end; $$;

grant execute on function public.init_profile(text) to anon, authenticated;
grant execute on function public.claim_share(text) to anon, authenticated;
grant execute on function public.recover(text) to anon, authenticated;

-- ── RLS ─────────────────────────────────────────────────────────────────────
alter table public.profiles      enable row level security;
alter table public.player_access enable row level security;
alter table public.player_shares enable row level security;
alter table public.players        enable row level security;
alter table public.rounds         enable row level security;

-- profiles: kun din egen rad
drop policy if exists profiles_self on public.profiles;
create policy profiles_self on public.profiles
  for all using (uid = auth.uid()) with check (uid = auth.uid());

-- player_access: se egne tilganger; sette inn egen tilgang til spillere du eier
drop policy if exists pa_select on public.player_access;
create policy pa_select on public.player_access
  for select using (uid = auth.uid());
drop policy if exists pa_insert on public.player_access;
create policy pa_insert on public.player_access
  for insert with check (
    uid = auth.uid()
    and exists (select 1 from public.players p where p.id = player_id and p.owner = auth.uid())
  );

-- player_shares: eier kan lage/se lenker for spillere de eier
drop policy if exists ps_owner on public.player_shares;
create policy ps_owner on public.player_shares
  for all using (
    exists (select 1 from public.players p where p.id = player_id and p.owner = auth.uid())
  ) with check (
    exists (select 1 from public.players p where p.id = player_id and p.owner = auth.uid())
  );

-- players: se spillere du har tilgang til; sette inn med deg selv som eier
drop policy if exists players_all on public.players;
drop policy if exists players_select on public.players;
drop policy if exists players_insert on public.players;
create policy players_select on public.players
  for select using (
    id in (select player_id from public.player_access where uid = auth.uid())
  );
create policy players_insert on public.players
  for insert with check (owner = auth.uid());

-- rounds: se/sette inn for spillere du har tilgang til
drop policy if exists rounds_all on public.rounds;
drop policy if exists rounds_select on public.rounds;
drop policy if exists rounds_insert on public.rounds;
create policy rounds_select on public.rounds
  for select using (
    player_id in (select player_id from public.player_access where uid = auth.uid())
  );
create policy rounds_insert on public.rounds
  for insert with check (
    player_id in (select player_id from public.player_access where uid = auth.uid())
  );
