#!/usr/bin/env bash
set -euo pipefail

DB_PATH=".data/quicknota.db"

if [ ! -f "$DB_PATH" ]; then
  echo "Database not found at $DB_PATH"
  exit 1
fi

sqlite3 "$DB_PATH" <<'SQL'
PRAGMA foreign_keys = ON;

-- Insert embed-public user if not exists
INSERT OR IGNORE INTO user (id, name, email) VALUES ('embed-public', 'Embed Public', 'embed@local');

-- Ensure company_settings row for embed-public exists
INSERT OR IGNORE INTO company_settings (userId, name, address, phone, email) VALUES ('embed-public', 'Embed Public', 'Alamat Embed', '', 'embed@local');

-- Optional: ensure minimal session table entry is not present (skip)

SQL

echo "Seed applied to $DB_PATH"
