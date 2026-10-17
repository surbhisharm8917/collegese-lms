#!/bin/sh
set -e

echo "Running database migrations..."
if [ ! -d "prisma/migrations" ] || [ -z "$(ls -A prisma/migrations 2>/dev/null)" ]; then
  echo "No Prisma migrations were packaged; refusing to alter production with db push." >&2
  exit 1
fi
./node_modules/.bin/prisma migrate deploy

echo "Starting API server..."
exec node dist/server.js
