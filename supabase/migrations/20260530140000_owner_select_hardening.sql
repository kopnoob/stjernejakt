-- Forsvar i dybden: en eier skal alltid se sine egne spillere/runder, ikke
-- bare via player_access (som settes av en after-trigger). Da virker også
-- insert med RETURNING, og data går aldri "tapt" om en tilgangsrad mangler.

drop policy if exists players_select on public.players;
create policy players_select on public.players
  for select using (
    owner = auth.uid()
    or id in (select player_id from public.player_access where uid = auth.uid())
  );

drop policy if exists rounds_select on public.rounds;
create policy rounds_select on public.rounds
  for select using (
    player_id in (select id from public.players where owner = auth.uid())
    or player_id in (select player_id from public.player_access where uid = auth.uid())
  );
