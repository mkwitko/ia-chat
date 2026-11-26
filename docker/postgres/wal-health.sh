#!/bin/sh
# RN-13: unhealthy when the last archived WAL is older than 15 minutes (or archiving never worked).
# Used as the backup service healthcheck; an external monitor (or autoheal) turns it into an alert.
set -eu

MAX_AGE_SECONDS=900
age=$(psql -h /var/run/postgresql -U postgres -Atc \
  "select coalesce(extract(epoch from now() - last_archived_time), 999999)::int from pg_stat_archiver")
[ "$age" -le "$MAX_AGE_SECONDS" ]
