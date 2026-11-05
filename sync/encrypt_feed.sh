#!/usr/bin/env bash
# Encrypts one pay clock feed line for the watch face.
# Usage: encrypt_feed.sh <32-hex-char key> "<feed line>"  > feed.txt
# Output: hex(iv) + hex(AES-128-CBC ciphertext, PKCS7 padding), one line.
set -euo pipefail
KEY="$1"; LINE="$2"
IV=$(openssl rand -hex 16)
CT=$(printf '%s' "$LINE" | openssl enc -aes-128-cbc -K "$KEY" -iv "$IV" | od -An -v -tx1 | tr -d ' \n')
printf '%s%s\n' "$IV" "$CT"
