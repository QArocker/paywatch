# paywatch

Encrypted pay feed for a Garmin watch face. `feed.txt` is AES-128-CBC encrypted (hex IV + ciphertext) and refreshed hourly by `sync/update.sh`.
