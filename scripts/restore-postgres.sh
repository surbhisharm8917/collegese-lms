#!/usr/bin/env sh
set -eu

if [ "$#" -lt 2 ]; then
  echo "Usage: $0 <database-url> <backup.dump>" >&2
  exit 2
fi

database_url="$1"
backup="$2"

pg_restore --list "$backup" >/dev/null
pg_restore --clean --if-exists --no-owner --no-privileges --exit-on-error --dbname="$database_url" "$backup"
echo "PostgreSQL restore completed and verified."
