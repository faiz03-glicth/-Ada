-- Each check raises if the hardening doesn't hold. Prints PASS lines as it goes.
\set ON_ERROR_STOP on

-- Existing rows were cleaned.
do $$ declare r record; begin
  select * into r from public.profiles where id = '00000000-0000-0000-0000-00000000000a';
  assert r.display_name = 'OldName', format('display_name cleaned, got %L', r.display_name);
  assert r.avatar_url is null, 'insecure avatar dropped';
  assert r.username is null, 'bad username dropped';
  assert r.time_zone = 'Asia/Kuala_Lumpur', 'valid time zone kept';
  raise notice 'PASS existing rows cleaned';
end $$;

-- Sign-up trigger sanitises user-supplied metadata and never fails the sign-up.
insert into auth.users (id, email, raw_user_meta_data, raw_app_meta_data) values
  ('00000000-0000-0000-0000-000000000001', 'a@example.com',
   jsonb_build_object('full_name', '  ' || repeat('x', 150) || E'\t', 'avatar_url', 'javascript:alert(1)'),
   '{"provider":"google"}'),
  ('00000000-0000-0000-0000-000000000002', 'b@example.com',
   '{"name":"Bea","avatar_url":"https://cdn.example/b.png"}', '{"provider":"phone"}'),
  ('00000000-0000-0000-0000-000000000003', 'c@example.com', '{"full_name":"   "}', '{}');
do $$ declare r record; begin
  select * into r from public.profiles where id = '00000000-0000-0000-0000-000000000001';
  assert char_length(r.display_name) = 100 and r.display_name !~ '[[:cntrl:]]', 'long name trimmed to 100';
  assert r.avatar_url is null, 'javascript: avatar dropped';
  assert r.provider = 'google', 'provider kept';
  select * into r from public.profiles where id = '00000000-0000-0000-0000-000000000002';
  assert r.display_name = 'Bea' and r.avatar_url = 'https://cdn.example/b.png', 'good values kept';
  assert r.provider = 'email', 'unknown provider mapped to email';
  select * into r from public.profiles where id = '00000000-0000-0000-0000-000000000003';
  assert r.display_name is null, 'blank name stored as null';
  raise notice 'PASS sign-up trigger sanitises';
end $$;

-- Soft-delete one user.
update public.profiles set deleted_at = now() where id = '00000000-0000-0000-0000-000000000003';

-- As signed-in user 1.
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', false);
do $$ begin
  assert (select count(*) from public.profiles) = 1, 'sees only own row';
  update public.profiles set display_name = 'New Name', username = 'faiz_1', time_zone = 'Europe/London'
    where id = '00000000-0000-0000-0000-000000000001';
  assert (select display_name from public.profiles) = 'New Name', 'can edit own name';
  raise notice 'PASS owner reads and edits own row';
end $$;

-- Server-owned columns can't be changed.
do $$ begin
  begin
    update public.profiles set provider = 'apple' where id = '00000000-0000-0000-0000-000000000001';
    raise exception 'provider was writable';
  exception when insufficient_privilege then null; end;
  begin
    update public.profiles set deleted_at = now() where id = '00000000-0000-0000-0000-000000000001';
    raise exception 'deleted_at was writable';
  exception when insufficient_privilege then null; end;
  begin
    update public.profiles set avatar_url = 'https://x' where id = '00000000-0000-0000-0000-000000000001';
    raise exception 'avatar_url was writable';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.profiles (id, provider) values ('00000000-0000-0000-0000-000000000001', 'email');
    raise exception 'insert was allowed';
  exception when insufficient_privilege then null; end;
  begin
    delete from public.profiles;
    raise exception 'delete was allowed';
  exception when insufficient_privilege then null; end;
  raise notice 'PASS server-owned columns, insert and delete are refused';
end $$;

-- Bad values are refused by the constraints.
do $$ begin
  begin update public.profiles set username = 'Faiz' where true; raise exception 'uppercase username accepted';
  exception when check_violation then null; end;
  begin update public.profiles set display_name = repeat('y', 101) where true; raise exception 'long name accepted';
  exception when check_violation then null; end;
  begin update public.profiles set display_name = E'a\x07b' where true; raise exception 'control char accepted';
  exception when check_violation then null; end;
  begin update public.profiles set display_name = E'bad\nname' where true; raise exception 'newline accepted';
  exception when check_violation then null; end;
  begin update public.profiles set time_zone = '<script>' where true; raise exception 'bad time zone accepted';
  exception when check_violation then null; end;
  raise notice 'PASS constraints refuse bad values';
end $$;

-- The trigger function isn't callable through the API.
do $$ begin
  assert not has_function_privilege('authenticated', 'public.handle_new_user()', 'execute'), 'authenticated can execute';
  assert not has_function_privilege('anon', 'public.handle_new_user()', 'execute'), 'anon can execute';
  raise notice 'PASS security-definer function not executable by API roles';
end $$;

-- A soft-deleted user sees and changes nothing.
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000003', false);
do $$ begin
  assert (select count(*) from public.profiles) = 0, 'deleted row visible';
  update public.profiles set display_name = 'Back' where true;
  reset role;
  assert (select display_name from public.profiles where id = '00000000-0000-0000-0000-000000000003') is null,
    'deleted row was updated';
  raise notice 'PASS soft-deleted rows are invisible and frozen';
end $$;

-- Anonymous callers get nothing.
set role anon;
do $$ begin
  begin perform * from public.profiles; raise exception 'anon could select';
  exception when insufficient_privilege then null; end;
  raise notice 'PASS anon has no access';
end $$;
reset role;
