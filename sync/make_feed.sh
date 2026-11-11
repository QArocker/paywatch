#!/usr/bin/env bash
# Works out the watch feed from a dump of the pay clock database and writes feed.txt when it changed.
# Usage: sync/make_feed.sh <32-hex-char key> <dump dir>     (dump dir holds shifts/*.json, stubs/*.json, settings/main.json)
# Prints only "updated" or "unchanged" (never the feed itself).
# Feed line: 12 fields from sync/feed.js | time written | savedEpoch of the last watch shift already imported (shift.imported)
set -euo pipefail
cd "$(dirname "$0")/.."
KEY="$1"; DIR="$(cd "$2" && pwd)"
[ -f "$DIR/settings/main.json" ] || { echo "dump has no settings/main.json" >&2; exit 2; }
[ -d "$DIR/shifts" ] && [ -d "$DIR/stubs" ] || { echo "dump has no shifts/ or stubs/ folder" >&2; exit 2; }
# Artem's clock: take the UTC offset from the system's time zone data and give Node a fixed-offset zone
OFF=$(TZ=America/Vancouver date +%z)
if [ "${OFF:3:2}" = "00" ]; then
  H=$((10#${OFF:1:2})); if [ "${OFF:0:1}" = "-" ]; then NTZ="Etc/GMT+$H"; else NTZ="Etc/GMT-$H"; fi
else NTZ="America/Vancouver"; fi
NEW=$(TZ="$NTZ" node sync/feed.js "$DIR")
case "$NEW" in v1\|*) ;; *) echo "feed.js gave no feed" >&2; exit 2;; esac
WS=0; [ -f shift.imported ] && WS=$(tr -dc '0-9' < shift.imported); WS=${WS:-0}
OLD=""; [ -f feed.txt ] && OLD=$(sync/decrypt.sh "$KEY" feed.txt 2>/dev/null || true)
OLD12=$(printf '%s' "$OLD" | cut -d'|' -f1-12); OLDWS=$(printf '%s' "$OLD" | cut -d'|' -f14)
if [ "$NEW" = "$OLD12" ] && [ "$WS" = "$OLDWS" ]; then echo unchanged; exit 0; fi
sync/update.sh "$KEY" "$NEW|$(date +%s)|$WS"
