#!/usr/bin/env bash
# Runs the migrations against a throwaway Postgres 17 (Docker) set up like Supabase, then checks the rules.
# Usage: bash supabase/tests/run.sh   (needs Docker running; removes its container when done)
set -euo pipefail
export MSYS_NO_PATHCONV=1
# Windows Git Bash needs a Windows path for docker cp (pwd -W); elsewhere plain pwd.
here="$(cd "$(dirname "$0")" && (pwd -W 2>/dev/null || pwd))"
migrations="$here/../migrations"
name=streak-sqltest
docker rm -f "$name" >/dev/null 2>&1 || true
docker run -d --name "$name" -e POSTGRES_PASSWORD=test postgres:17 >/dev/null
trap 'docker rm -f "$name" >/dev/null 2>&1' EXIT
until docker exec "$name" pg_isready -U postgres -q; do sleep 1; done
sleep 2
run() {
  docker cp "$1" "$name:/tmp/$(basename "$1")" >/dev/null
  docker exec "$name" psql -U postgres -q -v ON_ERROR_STOP=1 -f "/tmp/$(basename "$1")"
}
run "$here/00_supabase_stub.sql"
run "$migrations/0001_profiles.sql"
run "$here/10_existing_rows.sql"   # rows as they were before hardening
for migration in "$migrations"/0002_*.sql "$migrations"/0003_*.sql; do
  [ -e "$migration" ] && run "$migration"
done
run "$here/20_profile_checks.sql" 2>&1 | grep -E "PASS|ERROR"
# Teras's workout_days (from the Teras repo beside this one, read only) and what Streak reads from it.
teras="$here/../../../Teras/supabase/migrations/0001_workout_days.sql"
if [ -e "$teras" ]; then
  run "$teras"
  run "$here/40_workout_days_checks.sql" 2>&1 | grep -E "PASS|ERROR"
fi
