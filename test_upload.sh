#!/bin/bash

set -euo pipefail

if [[ -z "${ADMIN_USERNAME:-}" || -z "${ADMIN_PASSWORD:-}" ]]; then
  echo "Please set ADMIN_USERNAME and ADMIN_PASSWORD environment variables before running this script."
  exit 1
fi

if [[ -z "${TOKEN_UPLOAD:-}" ]]; then
  echo "Please set TOKEN_UPLOAD environment variable before running this script."
  exit 1
fi

COOKIE_JAR="$(mktemp)"
trap 'rm -f "$COOKIE_JAR"' EXIT

curl -sS -c "$COOKIE_JAR" -b "$COOKIE_JAR" -L \
  -X POST http://127.0.0.1:8405/auth/login \
  -H "Content-Type: application/x-www-form-urlencoded" \
  --data-urlencode "username=${ADMIN_USERNAME}" \
  --data-urlencode "password=${ADMIN_PASSWORD}" \
  --output /dev/null

curl -sS -b "$COOKIE_JAR" -c "$COOKIE_JAR" -X POST http://127.0.0.1:8405/api/upload \
  -F "file=@/Users/yim/lab/gitlab/telegram-upload-file/API_DOCS.md" \
  -F "chat_id=-1003443046435" \
  -F "chat_name=TEST_DATA" \
  -F "token_upload=${TOKEN_UPLOAD}" \
  -F "message_thread_id=2"

echo -e "\nUpload request sent."
