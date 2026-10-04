-- Read-only. Paste into the Supabase SQL editor (or run with psql) to see which of check_ins' rules a
-- database has. Every row numbered below 20 should say true; the rows from 20 up say what is in the project
-- beside it (Teras's table, the scheduler). It changes nothing and returns no check-in data.
with checks (n, what, ok) as (
  values
    (1, 'row level security is on',
      (select relrowsecurity from pg_class where oid = to_regclass('public.check_ins'))),
    (2, 'three access policies: read, insert, update (owner only)',
      (select count(*) = 3 from pg_policies where schemaname = 'public' and tablename = 'check_ins')),
    (3, 'times must be real (check_ins_times_in_range)',
      exists (select 1 from pg_constraint
              where conrelid = to_regclass('public.check_ins') and conname = 'check_ins_times_in_range')),
    (4, 'notes refuse U+2028 and U+2029 (check_ins_note_valid)',
      coalesce((select position('\u2028' in d) > 0 or position(chr(8232) in d) > 0
                from (select pg_get_constraintdef(oid) as d from pg_constraint
                      where conrelid = to_regclass('public.check_ins') and conname = 'check_ins_note_valid') c),
               false)),
    (5, 'a batch naming another account is refused',
      coalesce(position('another account' in pg_get_functiondef(to_regprocedure('public.push_check_ins(jsonb)'))) > 0,
               false)),
    (6, 'a deleted check-in keeps no note',
      coalesce(position('new.note := ''''' in pg_get_functiondef(to_regprocedure('public.check_ins_before_write()'))) > 0,
               false)),
    (7, 'the 50,000 limit is in place',
      exists (select 1 from pg_trigger
              where tgrelid = to_regclass('public.check_ins') and tgname = 'check_ins_quota' and not tgisinternal)),
    (8, 'the purge function exists, and nobody signed in or out can run it',
      coalesce(not has_function_privilege('authenticated', to_regprocedure('public.purge_deleted_check_ins()'), 'execute')
               and not has_function_privilege('anon', to_regprocedure('public.purge_deleted_check_ins()'), 'execute'),
               false)),
    (9, 'only signed-in people can push',
      coalesce(has_function_privilege('authenticated', to_regprocedure('public.push_check_ins(jsonb)'), 'execute')
               and not has_function_privilege('anon', to_regprocedure('public.push_check_ins(jsonb)'), 'execute'),
               false)),
    (10, 'signed-out callers can read nothing',
      coalesce(not has_table_privilege('anon', to_regclass('public.check_ins'), 'select'), false)),
    (11, 'no hard delete through the API',
      coalesce(not has_table_privilege('authenticated', to_regclass('public.check_ins'), 'delete'), false)),
    (12, 'fixed columns stay fixed (user_id, date, created_at, synced_at); note can be edited',
      coalesce(not has_column_privilege('authenticated', to_regclass('public.check_ins'), 'user_id', 'update')
               and not has_column_privilege('authenticated', to_regclass('public.check_ins'), 'date', 'update')
               and not has_column_privilege('authenticated', to_regclass('public.check_ins'), 'created_at', 'update')
               and not has_column_privilege('authenticated', to_regclass('public.check_ins'), 'synced_at', 'update')
               and has_column_privilege('authenticated', to_regclass('public.check_ins'), 'note', 'update'),
               false)),
    (13, 'no deleted check-in still holds a note',
      (select not exists (select 1 from public.check_ins where deleted_at is not null and note <> ''))),
    (20, 'extra: Teras''s workout_days table is in this project and signed-in people can read it',
      coalesce(has_table_privilege('authenticated', to_regclass('public.workout_days'), 'select'), false)),
    (21, 'extra: the scheduler (pg_cron) is installed, so the daily purge can run',
      exists (select 1 from pg_extension where extname = 'pg_cron'))
)
select n, what, ok from checks order by n;
