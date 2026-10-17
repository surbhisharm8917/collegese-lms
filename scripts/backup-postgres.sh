#!/usr/bin/env sh
set -eu

if [ "$#" -lt 2 ]; then
  echo "Usage: $0 <database-url> <output.dump>" >&2
  exit 2
fi

database_url="$1"
output="$2"
temporary="${output}.partial"

umask 077
mkdir -p "$(dirname "$output")"
rm -f "$temporary"

pg_dump --format=custom --compress=9 --no-owner --no-privileges --dbname="$database_url" --file="$temporary"
pg_restore --list "$temporary" >/dev/null
mv "$temporary" "$output"
echo "Verified PostgreSQL backup created at $output"
