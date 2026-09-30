# Supabase

Migrations for Streak's backend, applied in order (`migrations/0001_…`, `0002_…`). Apply a new one in the
Supabase SQL editor (or `supabase db push` once the CLI is set up). The `migrations/` folder is kept on this
computer only: it's gitignored, so the SQL isn't published with the public repos. Back it up.

## Rules for every table

The anon key ships inside the app, so anyone can call the REST API directly: the database, not the app,
decides what's allowed. For each new table (check-ins and activities will need these when sync arrives):

1. **Row Level Security in the same migration as `create table`**: `alter table … enable row level
security;` right after it, before any row can exist. No policy means no access.
2. **Policies per operation, owner only**: `using ((select auth.uid()) = user_id)`, plus
   `deleted_at is null` for soft-deleted tables, and a `with check` on insert/update.
3. **Least privilege**: `revoke all on … from anon, authenticated;` then grant back only what the app
   uses, by column for `update` (server-owned columns such as ids, timestamps and `deleted_at` stay out).
4. **Constraints for every client-writable column**: lengths, formats, allowed values. The app's zod
   checks are for the person; these are for everyone else.
5. **Functions aren't endpoints**: revoke `execute` from `public, anon, authenticated` on anything in
   `public` that isn't meant to be called as an RPC, especially `security definer` functions.

`0002_harden_profiles.sql` applies all five to `profiles`.
