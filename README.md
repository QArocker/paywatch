# paywatch

Encrypted pay feed for a Garmin watch face, and the shift saved by its companion widget.

- `feed.txt` — the feed the watch face and widget read, AES-128-CBC encrypted (hex IV + ciphertext).
- `shift.txt` — the shift last saved on the watch widget, encrypted the same way; `shift.imported` marks the last one copied into the pay clock.
- `sync/make_feed.sh KEY DUMP` — hourly: works out the feed from a dump of the pay clock database (`sync/feed.js`) and rewrites `feed.txt` when it changed.
- `sync/feed.js` — generated from the pay clock page by `sync/build_feed_js.py`, so the watch uses the page's own pay rules. Don't edit it by hand.
- `sync/update.sh`, `sync/encrypt_feed.sh`, `sync/decrypt.sh` — encryption helpers.
