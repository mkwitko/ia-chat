#!/usr/bin/env bash
# Point-in-time restore into a throwaway Postgres container (RN-12, RN-16).
# Reads the backups from the pgBackRest repository, recovers to a moment, starts a disposable
# server (no published port) and prints the row count of every table. With --expect-counts the
# counts must match the file (made with scripts/row-counts.sql) or the script fails.
#
#   scripts/restore-pitr.sh --env-file .env.db --target '2027-01-31 14:30:00+00'
#   scripts/restore-pitr.sh --env-file .env.db --latest --expect-counts counts.txt
#
# Options: --image IMAGE (default consultorio/postgres:local; use the one in production)
#          --network NAME (docker network that reaches the repository; tests use a local MinIO)
# The server keeps running while it is checked and everything is removed on exit.
set -euo pipefail

IMAGE=consultorio/postgres:local
ENV_FILE=
TARGET=
EXPECT=
NETWORK=
STANZA=main
PGDATA_DIR=/var/lib/postgresql/18/docker
HERE=$(cd "$(dirname "$0")" && pwd)

usage() { sed -n '2,13p' "$0"; exit 2; }
while [ $# -gt 0 ]; do
  case $1 in
    --env-file) ENV_FILE=$2; shift 2 ;;
    --target) TARGET=$2; shift 2 ;;
    --latest) TARGET=latest; shift ;;
    --expect-counts) EXPECT=$2; shift 2 ;;
    --image) IMAGE=$2; shift 2 ;;
    --network) NETWORK=$2; shift 2 ;;
    *) usage ;;
  esac
done
[ -n "$ENV_FILE" ] && [ -n "$TARGET" ] || usage

SUFFIX=$(date +%s)-$$
VOLUME=restore-pitr-$SUFFIX
CONTAINER=restore-pitr-$SUFFIX
NET_ARGS=()
[ -n "$NETWORK" ] && NET_ARGS=(--network "$NETWORK")

cleanup() {
  docker rm -f "$CONTAINER" >/dev/null 2>&1 || true
  docker volume rm "$VOLUME" >/dev/null 2>&1 || true
}
trap cleanup EXIT

# Same repository settings as docker-compose.prod.yml; the secrets come from --env-file.
PGB=(-e "PGBACKREST_STANZA=$STANZA" -e "PGBACKREST_PG1_PATH=$PGDATA_DIR"
  -e PGBACKREST_REPO1_TYPE=s3 -e PGBACKREST_REPO1_PATH=/consultorio -e PGBACKREST_REPO1_S3_URI_STYLE=path
  -e PGBACKREST_REPO1_CIPHER_TYPE=aes-256-cbc -e PGBACKREST_LOG_PATH=/tmp -e PGBACKREST_LOCK_PATH=/tmp
  -e "PGBACKREST_REPO1_STORAGE_VERIFY_TLS=${RESTORE_VERIFY_TLS:-y}")

started=$(date +%s)
docker volume create "$VOLUME" >/dev/null
# The volume starts root-owned; the postgres user needs the data directory.
docker run --rm "${NET_ARGS[@]}" -v "$VOLUME:/var/lib/postgresql" --entrypoint sh "$IMAGE" \
  -c "mkdir -p $PGDATA_DIR && chown -R postgres:postgres /var/lib/postgresql && chmod 700 $PGDATA_DIR"

if [ "$TARGET" = latest ]; then
  RECOVERY=(--type=default)
else
  RECOVERY=(--type=time "--target=$TARGET" --target-action=promote)
fi
echo "restore: stanza=$STANZA target=$TARGET"
docker run --rm "${NET_ARGS[@]}" --user postgres --env-file "$ENV_FILE" \
  "${PGB[@]}" \
  -v "$VOLUME:/var/lib/postgresql" --entrypoint pgbackrest "$IMAGE" \
  restore "${RECOVERY[@]}" --archive-mode=off

# The disposable server restores WAL from the repository until the target, then promotes.
docker run -d --name "$CONTAINER" "${NET_ARGS[@]}" --env-file "$ENV_FILE" \
  "${PGB[@]}" \
  -v "$VOLUME:/var/lib/postgresql" "$IMAGE" >/dev/null

psql_in() { docker exec -i "$CONTAINER" psql -U postgres -d app -At "$@"; }

for _ in $(seq 1 120); do
  if psql_in -c 'select 1' >/dev/null 2>&1 && [ "$(psql_in -c 'select pg_is_in_recovery()')" = f ]; then
    ready=1; break
  fi
  sleep 2
done
[ "${ready:-0}" = 1 ] || { docker logs --tail 40 "$CONTAINER" >&2; echo 'FAIL: server did not finish recovery' >&2; exit 1; }

counts=$(psql_in -f - <"$HERE/row-counts.sql")
echo "$counts"
tables=$(printf '%s\n' "$counts" | grep -c '|' || true)
migrations=$(printf '%s\n' "$counts" | awk -F'|' '$1=="_prisma_migrations"{print $2}')
[ "$tables" -gt 0 ] || { echo 'FAIL: no tables after restore' >&2; exit 1; }
if [ -n "$EXPECT" ]; then
  if ! diff <(printf '%s\n' "$counts") "$EXPECT" >&2; then echo 'FAIL: row counts differ from the expected file' >&2; exit 1; fi
  echo 'row counts match the expected file'
elif [ -z "${migrations:-}" ] || [ "$migrations" -eq 0 ]; then
  echo 'FAIL: _prisma_migrations is empty or missing' >&2; exit 1
fi
echo "OK: restored to '$TARGET' in $(( $(date +%s) - started ))s, $tables tables"
