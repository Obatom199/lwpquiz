-- Run once in Supabase: SQL Editor > New query > paste > Run.
-- Safe to run again if you used the earlier version of this file.
create table if not exists lq_games   (code text primary key, state jsonb, created_at timestamptz default now());
create table if not exists lq_players (id text primary key, code text not null, name text not null,
                                       score int default 0, pts int default 0, choice int default -1);
create table if not exists lq_answers (code text, pid text, choice int,
                                       at bigint default (extract(epoch from clock_timestamp())*1000)::bigint,
                                       primary key (code, pid));

create or replace function lq_server_ms() returns bigint language sql
as $$ select (extract(epoch from clock_timestamp())*1000)::bigint $$;

alter table lq_games   enable row level security;
alter table lq_players enable row level security;
alter table lq_answers enable row level security;
drop policy if exists "open" on lq_games;   drop policy if exists "open" on lq_players;   drop policy if exists "open" on lq_answers;
drop policy if exists "read" on lq_games;   drop policy if exists "read" on lq_players;   drop policy if exists "read" on lq_answers;
drop policy if exists "admin" on lq_games;  drop policy if exists "admin" on lq_players;  drop policy if exists "admin" on lq_answers;
drop policy if exists "join" on lq_players; drop policy if exists "answer" on lq_answers;

-- everyone can watch the game
create policy "read" on lq_games   for select using (true);
create policy "read" on lq_players for select using (true);
create policy "read" on lq_answers for select using (true);
-- players can only join and answer
create policy "join"   on lq_players for insert to anon with check (true);
create policy "answer" on lq_answers for insert to anon with check (true);
-- the logged-in admin controls everything
create policy "admin" on lq_games   for all to authenticated using (true) with check (true);
create policy "admin" on lq_players for all to authenticated using (true) with check (true);
create policy "admin" on lq_answers for all to authenticated using (true) with check (true);
-- players cannot set their own score or answer time
revoke insert on lq_players, lq_answers from anon;
grant insert (id, code, name) on lq_players to anon;
grant insert (code, pid, choice) on lq_answers to anon;

do $$ begin alter publication supabase_realtime add table lq_games, lq_players, lq_answers;
exception when others then null; end $$;
