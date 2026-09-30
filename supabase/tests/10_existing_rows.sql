-- Rows as they might exist before hardening (written under 0001's looser rules).
insert into auth.users (id, email) values ('00000000-0000-0000-0000-00000000000a', 'old@example.com');
update public.profiles set
  display_name = E'  Old\nName  ',
  avatar_url = 'http://insecure.example/a.png',
  username = 'Faiz!',
  time_zone = 'Asia/Kuala_Lumpur'
where id = '00000000-0000-0000-0000-00000000000a';
