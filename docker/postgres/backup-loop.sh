#!/bin/sh
# Backup sidecar (RN-10): shares the data directory and the socket with the postgres service.
# WAL is archived by the server itself (archive_command); this loop creates the stanza, takes a
# full backup on Sundays and a differential one on the other days, and emits a WAL heartbeat so
# the archive never looks stale on an idle database (see wal-health.sh).
# Retention (expire runs after each backup): PGBACKREST_REPO1_RETENTION_FULL / _DIFF.
set -eu

STANZA=${PGBACKREST_STANZA:-main}
HOUR=${BACKUP_HOUR_UTC:-06}
SUNDAY=7
LAST_RUN=/tmp/pgbackrest/last-run
SOCKET=/var/run/postgresql

until pg_isready -q -h "$SOCKET"; do sleep 2; done
pgbackrest stanza-create
pgbackrest check

# A first full backup right away, so there is a restore point before the first night.
if ! pgbackrest info | grep -q 'full backup:'; then
  pgbackrest backup --type=full
fi

while true; do
  psql -h "$SOCKET" -U postgres -Atqc "select pg_logical_emit_message(false, 'heartbeat', 'x')" >/dev/null
  today=$(date -u +%F)
  if [ "$(date -u +%H)" = "$HOUR" ] && [ "$(cat "$LAST_RUN" 2>/dev/null || true)" != "$today" ]; then
    if [ "$(date -u +%u)" = "$SUNDAY" ]; then type=full; else type=diff; fi
    pgbackrest backup --type="$type" && echo "$today" >"$LAST_RUN"
  fi
  sleep 60
done
