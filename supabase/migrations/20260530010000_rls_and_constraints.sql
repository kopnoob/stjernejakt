-- E1: stram RLS til KUN lesing + innsetting.
-- Datamodellen er insert-only (hver rad har unik id og endres aldri; sletting
-- er en lokal tombstone). Da trenger ikke anon-nøkkelen update/delete — og
-- siden repoet er offentlig og anon-nøkkelen kan hentes ut, fjerner vi dem.
alter table public.players enable row level security;
alter table public.rounds  enable row level security;

drop policy if exists "players_all" on public.players;
drop policy if exists "rounds_all"  on public.rounds;

create policy "players_select" on public.players for select using (true);
create policy "players_insert" on public.players for insert with check (true);
create policy "rounds_select"  on public.rounds  for select using (true);
create policy "rounds_insert"  on public.rounds  for insert with check (true);
-- Ingen update/delete-policy ⇒ anon kan verken endre eller slette rader.

-- F5: verdiområde-sjekker for robusthet (NOT VALID ⇒ blokkerer ikke
-- eksisterende rader, men håndheves for alle nye innsettinger).
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
