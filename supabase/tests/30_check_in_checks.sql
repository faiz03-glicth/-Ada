-- check_ins (0003): each check raises if a rule doesn't hold. Prints PASS lines as it goes.
-- Runs after 20_profile_checks.sql, which created auth users 1–3.
\set ON_ERROR_STOP on
reset role;

-- As signed-in user 1.
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', false);

-- A batch with a row for another account is refused whole: nothing is stored, not even the rows that
-- name the caller. (The phone sends the account it is signed in as; a mismatch means the session changed.)
do $$ begin
  begin
    perform public.push_check_ins(jsonb_build_array(
      jsonb_build_object('id', 'c0000000-0000-0000-0000-000000000001', 'user_id', '00000000-0000-0000-0000-000000000001',
        'date', '2026-10-01', 'minute', 480, 'activity_id', 'walk', 'note', 'Morning walk',
        'created_at', '2026-10-01T08:00:00Z', 'updated_at', '2026-10-01T08:00:00Z', 'deleted_at', null),
      jsonb_build_object('id', 'c0000000-0000-0000-0000-0000000000a9', 'user_id', '00000000-0000-0000-0000-000000000002',
        'date', '2026-10-01', 'minute', 480, 'activity_id', 'walk', 'note', '',
        'created_at', '2026-10-01T08:00:00Z', 'updated_at', '2026-10-01T08:00:00Z', 'deleted_at', null)));
    raise exception 'a row for another account was accepted';
  exception when insufficient_privilege then null; end;
  assert (select count(*) from public.check_ins) = 0, 'a refused batch stores nothing';
  raise notice 'PASS a batch naming another account is refused whole';
end $$;

-- Push inserts new rows, as the caller: user_id comes from the session, and a row may omit it.
do $$ begin
  perform public.push_check_ins(jsonb_build_array(
    jsonb_build_object('id', 'c0000000-0000-0000-0000-000000000001', 'user_id', '00000000-0000-0000-0000-000000000001',
      'date', '2026-10-01', 'minute', 480, 'activity_id', 'walk', 'note', 'Morning walk',
      'created_at', '2026-10-01T08:00:00Z', 'updated_at', '2026-10-01T08:00:00Z', 'deleted_at', null),
    jsonb_build_object('id', 'c0000000-0000-0000-0000-000000000002',
      'date', '2026-10-02', 'minute', 0, 'activity_id', 'reading', 'note', '',
      'created_at', '2026-10-02T00:00:00Z', 'updated_at', '2026-10-02T00:00:00Z', 'deleted_at', null)
  ));
  assert (select count(*) from public.check_ins) = 2, 'both rows stored';
  assert (select count(*) from public.check_ins where user_id = '00000000-0000-0000-0000-000000000001') = 2,
    'user_id is the caller''s';
  raise notice 'PASS push inserts, as the caller';
end $$;

create temporary table seen as select id, synced_at from public.check_ins;

-- Sending the same batch again changes nothing (not even synced_at).
do $$ begin
  perform public.push_check_ins(jsonb_build_array(
    jsonb_build_object('id', 'c0000000-0000-0000-0000-000000000001',
      'date', '2026-10-01', 'minute', 480, 'activity_id', 'walk', 'note', 'Morning walk',
      'created_at', '2026-10-01T08:00:00Z', 'updated_at', '2026-10-01T08:00:00Z', 'deleted_at', null)));
  assert (select c.synced_at = s.synced_at from public.check_ins c join seen s using (id)
          where c.id = 'c0000000-0000-0000-0000-000000000001'), 'a re-sent row is not touched';
  raise notice 'PASS re-sending is harmless';
end $$;

-- An older edit is ignored; a newer one wins and moves synced_at.
do $$ begin
  perform public.push_check_ins(jsonb_build_array(
    jsonb_build_object('id', 'c0000000-0000-0000-0000-000000000001',
      'date', '2026-10-01', 'minute', 480, 'activity_id', 'walk', 'note', 'stale',
      'created_at', '2026-10-01T08:00:00Z', 'updated_at', '2026-09-30T08:00:00Z', 'deleted_at', null)));
  assert (select note from public.check_ins where id = 'c0000000-0000-0000-0000-000000000001') = 'Morning walk',
    'older edit ignored';

  perform public.push_check_ins(jsonb_build_array(
    jsonb_build_object('id', 'c0000000-0000-0000-0000-000000000001',
      'date', '2026-10-01', 'minute', 480, 'activity_id', 'walk', 'note', 'Morning walk',
      'created_at', '2026-10-01T08:00:00Z', 'updated_at', '2026-10-03T09:00:00Z',
      'deleted_at', '2026-10-03T09:00:00Z')));
  assert (select deleted_at is not null from public.check_ins where id = 'c0000000-0000-0000-0000-000000000001'),
    'newer edit (a deletion) applied';
  assert (select c.synced_at > s.synced_at from public.check_ins c join seen s using (id)
          where c.id = 'c0000000-0000-0000-0000-000000000001'), 'synced_at moved on';
  raise notice 'PASS the newest edit wins';
end $$;

-- A deleted row stays readable by its owner (its tombstone must reach other phones).
do $$ begin
  assert (select count(*) from public.check_ins where deleted_at is not null) = 1, 'tombstone readable';
  raise notice 'PASS tombstones are readable by their owner';
end $$;

-- A deleted check-in keeps no note, even though the deletion was sent with one; restoring it (Undo) sends
-- the note again and it comes back.
do $$ begin
  assert (select note from public.check_ins where id = 'c0000000-0000-0000-0000-000000000001') = '',
    'the deleted row''s note was blanked';

  perform public.push_check_ins(jsonb_build_array(
    jsonb_build_object('id', 'c0000000-0000-0000-0000-000000000001',
      'date', '2026-10-01', 'minute', 480, 'activity_id', 'walk', 'note', 'Morning walk',
      'created_at', '2026-10-01T08:00:00Z', 'updated_at', '2026-10-03T10:00:00Z', 'deleted_at', null)));
  assert (select note = 'Morning walk' and deleted_at is null from public.check_ins
          where id = 'c0000000-0000-0000-0000-000000000001'), 'a restore brings the note back';

  perform public.push_check_ins(jsonb_build_array(
    jsonb_build_object('id', 'c0000000-0000-0000-0000-000000000001',
      'date', '2026-10-01', 'minute', 480, 'activity_id', 'walk', 'note', 'Morning walk',
      'created_at', '2026-10-01T08:00:00Z', 'updated_at', '2026-10-03T11:00:00Z',
      'deleted_at', '2026-10-03T11:00:00Z')));
  assert (select note = '' and deleted_at is not null from public.check_ins
          where id = 'c0000000-0000-0000-0000-000000000001'), 'deleted again, blank again';
  raise notice 'PASS a deleted check-in keeps no note; a restore brings it back';
end $$;

-- A clock far ahead can't make an edit unbeatable.
do $$ begin
  perform public.push_check_ins(jsonb_build_array(
    jsonb_build_object('id', 'c0000000-0000-0000-0000-000000000003',
      'date', '2026-10-02', 'minute', 60, 'activity_id', 'walk', 'note', '',
      'created_at', '2026-10-02T01:00:00Z', 'updated_at', (now() + interval '1 year')::text, 'deleted_at', null)));
  assert (select updated_at <= now() + interval '5 minutes' from public.check_ins
          where id = 'c0000000-0000-0000-0000-000000000003'), 'future updated_at clamped';
  raise notice 'PASS clocks ahead are clamped';
end $$;

-- Fixed and server-owned columns can't be changed; rows can't be hard-deleted or written directly with
-- synced_at.
do $$ begin
  begin update public.check_ins set user_id = '00000000-0000-0000-0000-000000000002' where true;
    raise exception 'user_id was writable';
  exception when insufficient_privilege then null; end;
  begin update public.check_ins set date = '2026-01-01' where true; raise exception 'date was writable';
  exception when insufficient_privilege then null; end;
  begin update public.check_ins set created_at = now() where true; raise exception 'created_at was writable';
  exception when insufficient_privilege then null; end;
  begin update public.check_ins set synced_at = now() where true; raise exception 'synced_at was writable';
  exception when insufficient_privilege then null; end;
  begin delete from public.check_ins; raise exception 'delete was allowed';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.check_ins (id, user_id, date, minute, activity_id, created_at, updated_at, synced_at)
    values ('c0000000-0000-0000-0000-0000000000ff', '00000000-0000-0000-0000-000000000001', '2026-10-01', 1,
            'walk', now(), now(), '2000-01-01');
    raise exception 'synced_at was insertable';
  exception when insufficient_privilege then null; end;
  raise notice 'PASS fixed and server-owned columns, and hard delete, are refused';
end $$;

-- Bad values are refused.
create function pg_temp.push_one(p_date text, p_minute int, p_activity text, p_note text) returns void
language sql as $$
  select public.push_check_ins(jsonb_build_array(jsonb_build_object(
    'id', gen_random_uuid(), 'date', p_date, 'minute', p_minute, 'activity_id', p_activity, 'note', p_note,
    'created_at', now(), 'updated_at', now(), 'deleted_at', null)));
$$;
do $$ begin
  begin perform pg_temp.push_one('2026-10-01', 1440, 'walk', ''); raise exception 'minute 1440 accepted';
  exception when check_violation then null; end;
  begin perform pg_temp.push_one('2026-10-01', -1, 'walk', ''); raise exception 'minute -1 accepted';
  exception when check_violation then null; end;
  begin perform pg_temp.push_one('1999-12-31', 0, 'walk', ''); raise exception '1999 accepted';
  exception when check_violation then null; end;
  begin perform pg_temp.push_one('2026-10-01', 0, 'Walk!', ''); raise exception 'bad activity id accepted';
  exception when check_violation then null; end;
  begin perform pg_temp.push_one('2026-10-01', 0, repeat('a', 41), ''); raise exception 'long activity id accepted';
  exception when check_violation then null; end;
  begin perform pg_temp.push_one('2026-10-01', 0, 'walk', repeat('n', 281)); raise exception '281-char note accepted';
  exception when check_violation then null; end;
  begin perform pg_temp.push_one('2026-10-01', 0, 'walk', E'two\nlines'); raise exception 'line break accepted';
  exception when check_violation then null; end;
  begin perform pg_temp.push_one('2026-10-01', 0, 'walk', E'tab\there'); raise exception 'tab accepted';
  exception when check_violation then null; end;
  begin perform pg_temp.push_one('2026-10-01', 0, 'walk', E'sep arator'); raise exception 'U+2028 accepted';
  exception when check_violation then null; end;
  begin perform pg_temp.push_one((current_date + 2)::text, 0, 'walk', ''); raise exception 'future day accepted';
  exception when insufficient_privilege then null; end;
  perform pg_temp.push_one('2026-10-01', 1439, 'custom_activity-2', repeat('é', 280));
  perform pg_temp.push_one((current_date + 1)::text, 0, 'walk', 'Ünïcödé ✓ and emoji 🏃');
  raise notice 'PASS bad values are refused, good ones kept';
end $$;

-- Times must be real: a row holding infinity, a BC date or year 12345 would stop other phones' pulls there.
create function pg_temp.push_at(p_created text, p_updated text, p_deleted text) returns void
language sql as $$
  select public.push_check_ins(jsonb_build_array(jsonb_build_object(
    'id', gen_random_uuid(), 'date', '2026-10-01', 'minute', 0, 'activity_id', 'walk', 'note', '',
    'created_at', p_created, 'updated_at', p_updated, 'deleted_at', p_deleted)));
$$;
do $$ begin
  begin perform pg_temp.push_at('infinity', '2026-10-01T00:00:00Z', null); raise exception 'infinity created_at accepted';
  exception when check_violation then null; end;
  begin perform pg_temp.push_at('0001-01-01 00:00:00+00 BC', '2026-10-01T00:00:00Z', null);
    raise exception 'BC created_at accepted';
  exception when check_violation then null; end;
  begin perform pg_temp.push_at('2026-10-01T00:00:00Z', '-infinity', null); raise exception '-infinity updated_at accepted';
  exception when check_violation then null; end;
  begin perform pg_temp.push_at('2026-10-01T00:00:00Z', '1999-12-31T23:59:59Z', null);
    raise exception '1999 updated_at accepted';
  exception when check_violation then null; end;
  begin perform pg_temp.push_at('2026-10-01T00:00:00Z', '2026-10-01T00:00:00Z', '12345-01-01 00:00:00+00');
    raise exception 'year 12345 deleted_at accepted';
  exception when check_violation then null; end;
  begin perform pg_temp.push_at('2026-10-01T00:00:00Z', '2026-10-01T00:00:00Z', 'infinity');
    raise exception 'infinity deleted_at accepted';
  exception when check_violation then null; end;
  -- A future updated_at (infinity too) is clamped to now, never stored as it was sent.
  perform pg_temp.push_at('2026-10-01T00:00:00Z', 'infinity', null);
  assert (select count(*) from public.check_ins where updated_at = 'infinity') = 0, 'infinity updated_at stored';
  perform pg_temp.push_at('2000-01-01T00:00:00Z', '2026-10-01T00:00:00Z', '2026-10-02T00:00:00Z');
  raise notice 'PASS times must be real: no infinity, BC or far-future dates';
end $$;

-- A batch is at most 500 check-ins, and must be an array.
do $$ begin
  begin
    perform public.push_check_ins((select jsonb_agg(jsonb_build_object('id', gen_random_uuid()))
                                   from generate_series(1, 501)));
    raise exception '501 rows accepted';
  exception when invalid_parameter_value then null; end;
  begin perform public.push_check_ins('{}'::jsonb); raise exception 'an object accepted';
  exception when invalid_parameter_value then null; end;
  raise notice 'PASS batches are bounded';
end $$;

-- As signed-in user 2: user 1's check-ins are invisible and can't be taken over.
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000002', false);
do $$ begin
  assert (select count(*) from public.check_ins) = 0, 'user 2 sees none of user 1''s rows';
  begin
    perform public.push_check_ins(jsonb_build_array(
      jsonb_build_object('id', 'c0000000-0000-0000-0000-000000000002',
        'date', '2026-10-02', 'minute', 0, 'activity_id', 'walk', 'note', 'hijack',
        'created_at', now(), 'updated_at', now() + interval '1 minute', 'deleted_at', null)));
    raise exception 'user 2 overwrote user 1''s row';
  exception when insufficient_privilege then null; end;
  update public.check_ins set note = 'hijack', updated_at = now() + interval '1 minute' where true;
  raise notice 'PASS other people''s check-ins are invisible and untouchable';
end $$;

reset role;
do $$ begin
  assert (select count(*) from public.check_ins where note = 'hijack') = 0, 'nothing of user 1''s changed';
end $$;

-- Anon: nothing at all.
set role anon;
do $$ begin
  begin perform 1 from public.check_ins; raise exception 'anon could read';
  exception when insufficient_privilege then null; end;
  begin perform public.push_check_ins('[]'::jsonb); raise exception 'anon could push';
  exception when insufficient_privilege then null; end;
  raise notice 'PASS anon gets nothing';
end $$;
reset role;

-- Deleting the auth user removes their check-ins.
do $$ begin
  delete from auth.users where id = '00000000-0000-0000-0000-000000000001';
  assert (select count(*) from public.check_ins) = 0, 'check-ins cascade with the user';
  raise notice 'PASS check-ins go with the account';
end $$;
