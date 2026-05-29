-- Spilleren har et "nåværende handicap" som boardet fokuserer på.
-- Default 5 (vanlig startpunkt). Spillere kan endres opp/ned ved behov.
alter table public.players
  add column if not exists current_hcp int not null default 5;
