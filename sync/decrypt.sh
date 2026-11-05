#!/usr/bin/env bash
# Decrypts a file written by encrypt_feed.sh or the watch widget (hex IV + hex AES-128-CBC, PKCS7).
# Usage: sync/decrypt.sh <32-hex-char key> <file>   -> prints the plain line
set -euo pipefail
KEY="$1"; H=$(tr -d ' \n\r' < "$2")
IV=${H:0:32}; CT=${H:32}
printf '%s' "$CT" | python3 -c "import sys;sys.stdout.buffer.write(bytes.fromhex(sys.stdin.read()))" \
  | openssl enc -d -aes-128-cbc -K "$KEY" -iv "$IV"
echo
