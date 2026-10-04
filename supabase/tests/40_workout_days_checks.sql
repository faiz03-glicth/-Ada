-- What Streak reads from Teras's workout_days, checked against Teras's own migration (from the Teras repo
-- beside this one): each day's date, whether it had a workout, and when it changed, for its owner only.
-- Streak asks PostgREST for select=date,updated_at,worked_out:sets::boolean, which runs as the casts below
-- (`level` is a smallint, which Postgres can't cast to boolean; `sets` can, and Teras's rule is that a
-- day with no completed sets is level 0, No workout). Prints PASS lines as it goes.
\set ON_ERROR_STOP on

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000041', 'w1@example.com'),
  ('00000000-0000-0000-0000-000000000042', 'w2@example.com');

-- Rows as Teras writes them: a day whose sets were all removed keeps its row, at level 0.
insert into public.workout_days (user_id, date, volume_kg, sets, workouts, level) values
  ('00000000-0000-0000-0000-000000000041', '2026-10-01', 4250, 12, 2, 3),
  ('00000000-0000-0000-0000-000000000041', '2026-10-02', 0, 0, 0, 0),
  ('00000000-0000-0000-0000-000000000041', '2026-10-03', 0, 4, 1, 1),
  ('00000000-0000-0000-0000-000000000042', '2026-10-01', 900, 6, 1, 2);

-- As signed-in user 41, through the API role.
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000041', false);

do $$ declare r record; got text := ''; begin
  for r in
    select date, updated_at, cast(sets as boolean) as worked_out
      from public.workout_days
     where user_id = '00000000-0000-0000-0000-000000000041'
     order by updated_at, date
  loop
    got := got || format('%s=%s ', r.date, r.worked_out);
  end loop;
  assert got = '2026-10-01=t 2026-10-02=f 2026-10-03=t ', format('got %s', got);
  raise notice 'PASS each day reads as worked out or not, from its sets';
end $$;

do $$ begin
  assert (select count(*) from public.workout_days) = 3, 'sees only own days';
  assert not exists (
    select 1 from public.workout_days where user_id = '00000000-0000-0000-0000-000000000042'
  ), 'another account''s days are hidden';
  raise notice 'PASS only the owner''s days are readable';
end $$;

-- The bookmark is the server's time exactly as JSON wrote it, plus the last date pulled.
do $$ declare mark text; n int; begin
  select to_json(updated_at) #>> '{}' into mark from public.workout_days where date = '2026-10-01';
  select count(*) into n from public.workout_days
   where updated_at > mark::timestamptz or (updated_at = mark::timestamptz and date > '2026-10-01');
  assert n = 2, format('after the bookmark: %s', n);
  raise notice 'PASS the bookmark skips nothing and repeats nothing';
end $$;

-- Teras removes every set of the 3rd: the row stays, comes after the bookmark, and reads as no workout.
do $$ declare mark text; r record; got text := ''; begin
  select to_json(max(updated_at)) #>> '{}' into mark from public.workout_days;
  update public.workout_days set volume_kg = 0, sets = 0, workouts = 0, level = 0
   where date = '2026-10-03';
  for r in
    select date, cast(sets as boolean) as worked_out
      from public.workout_days
     where updated_at > mark::timestamptz or (updated_at = mark::timestamptz and date > '2026-10-03')
     order by updated_at, date
  loop
    got := got || format('%s=%s ', r.date, r.worked_out);
  end loop;
  assert got = '2026-10-03=f ', format('got %s', got);
  raise notice 'PASS a day emptied in Teras comes after the bookmark, as no workout';
end $$;

-- Signed out: nothing.
reset role;
set role anon;
select set_config('request.jwt.claim.sub', '', false);
do $$ declare n int; begin
  begin
    select count(*) into n from public.workout_days;
    assert n = 0, format('anon saw %s days', n);
  exception when insufficient_privilege then null;
  end;
  raise notice 'PASS signed-out callers read nothing';
end $$;
