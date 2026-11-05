#!/usr/bin/env bash
# Writes feed.txt (encrypted) and feed.sha in the repo root when the feed line changed.
# Usage: sync/update.sh <32-hex-char key> "<feed line>"
# Prints "updated" or "unchanged".
set -euo pipefail
cd "$(dirname "$0")/.."
KEY="$1"; LINE="$2"
case "$LINE" in v1\|*) ;; *) echo "bad feed line" >&2; exit 2;; esac
SHA=$(printf '%s%s' "$KEY" "$LINE" | sha256sum | cut -c1-16)
if [ -f feed.sha ] && [ "$(cat feed.sha)" = "$SHA" ]; then echo unchanged; exit 0; fi
sync/encrypt_feed.sh "$KEY" "$LINE" > feed.txt
echo "$SHA" > feed.sha
echo updated
