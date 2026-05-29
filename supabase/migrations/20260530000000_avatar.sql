-- Barnet kan velge en emoji-figur som avatar (valgfri).
-- current_hcp er nå en lokal enhets-preferanse og brukes ikke lenger som
-- delt felt; vi lar kolonnen ligge (gammel data) men slutter å skrive til den.
alter table public.players
  add column if not exists avatar text;
