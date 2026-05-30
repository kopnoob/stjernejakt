-- Fiks: delt gjenopprettingskode = samme KONTO, med delt synlighet FREMOVER.
--
-- Før ga recover() bare et engangs-øyeblikksbilde (player_access pr spiller på
-- gjenopprettings-tidspunktet). Nye spillere ble ikke delt. Nå er synlighet
-- KONTO-basert: alle identiteter med samme recovery_hash ser hverandres
-- spillere/runder — også de som lages senere. (Delingslenke er fortsatt
-- per-spiller for deling på tvers av kontoer.)

-- Alle identiteter i samme konto (samme recovery_hash som meg).
create or replace function public.account_uids() returns setof uuid
language sql stable security definer set search_path = public as $$
  select p.uid from public.profiles p
  where p.recovery_hash = (
    select recovery_hash from public.profiles where uid = auth.uid()
  )
$$;
grant execute on function public.account_uids() to anon, authenticated;

-- players: egne + konto-medlemmenes + delte (via lenke)
drop policy if exists players_select on public.players;
create policy players_select on public.players for select using (
  owner = auth.uid()
  or owner in (select public.account_uids())
  or id in (select player_id from public.player_access where uid = auth.uid())
);

-- rounds: se for spillere du har tilgang til
drop policy if exists rounds_select on public.rounds;
create policy rounds_select on public.rounds for select using (
  player_id in (
    select id from public.players
    where owner = auth.uid() or owner in (select public.account_uids())
  )
  or player_id in (select player_id from public.player_access where uid = auth.uid())
);

-- rounds insert: legg til runder for spillere du har tilgang til (begge foreldre)
drop policy if exists rounds_insert on public.rounds;
create policy rounds_insert on public.rounds for insert with check (
  player_id in (
    select id from public.players
    where owner = auth.uid() or owner in (select public.account_uids())
  )
  or player_id in (select player_id from public.player_access where uid = auth.uid())
);

-- recover: bli med i kontoen (synlighet håndteres nå av policyene over).
create or replace function public.recover(p_code text) returns int
language plpgsql security definer set search_path = public, extensions as $$
declare v_hash text; v_count int;
begin
  v_hash := encode(digest(p_code, 'sha256'), 'hex');
  if not exists (select 1 from public.profiles where recovery_hash = v_hash) then
    return -1;
  end if;
  insert into public.profiles(uid, recovery_hash) values (auth.uid(), v_hash)
    on conflict (uid) do update set recovery_hash = excluded.recovery_hash;
  select count(*) into v_count from public.players
    where owner in (select uid from public.profiles where recovery_hash = v_hash);
  return v_count;
end; $$;
