#!/usr/bin/env sh
set -eu

if [ "$#" -lt 2 ]; then
  echo "Usage: $0 <rclone-source> <rclone-destination>" >&2
  echo "Example: $0 azure:private-content s3:jecc-production-private-content" >&2
  exit 2
fi

source_remote="$1"
destination_remote="$2"

command -v rclone >/dev/null 2>&1 || {
  echo "rclone is required for provider-to-provider storage migration." >&2
  exit 1
}

rclone copy "$source_remote" "$destination_remote" --checksum --transfers 8 --checkers 16 --progress
rclone check "$source_remote" "$destination_remote" --one-way --checksum
echo "Storage copy and checksum verification completed."
