#!/usr/bin/env bash
# End-to-end backup drill against a local MinIO (no cloud, no real data). Proves, with the real
# production services (postgres + backup from docker-compose.prod.yml) and scripts/restore-pitr.sh:
#   WAL archiving, full backup, encryption, and recovery to a chosen moment (rows written after it are gone).
# Needs docker and the image: docker build -t consultorio/postgres:local docker/postgres
set -euo pipefail

ROOT=$(cd "$(dirname "$0")/.." && pwd)
WORK=$(mktemp -d)
NET=drill-net
MINIO=drill-minio
PROJECT=drill
MINIO_USER=drilluser
MINIO_PASS=$(openssl rand -hex 12)
IMAGE=${IMAGE:-consultorio/postgres:local}
export COMPOSE_PROJECT_NAME=$PROJECT

cleanup() {
  (cd "$WORK" && docker compose -f docker-compose.prod.yml -f override.yml --env-file .env down -v >/dev/null 2>&1) || true
  docker rm -f "$MINIO" >/dev/null 2>&1 || true
  docker network rm "$NET" >/dev/null 2>&1 || true
  rm -rf "$WORK"
}
trap cleanup EXIT

dc() { (cd "$WORK" && docker compose -f docker-compose.prod.yml -f override.yml --env-file .env "$@"); }
sql() { dc exec -T postgres psql -U postgres -d app -At -v ON_ERROR_STOP=1 "$@"; }

docker network create "$NET" >/dev/null
openssl req -x509 -newkey rsa:2048 -nodes -days 1 -subj /CN=minio -addext subjectAltName=DNS:minio \
  -keyout "$WORK/private.key" -out "$WORK/public.crt" 2>/dev/null
chmod 644 "$WORK/private.key"

# MinIO stopped publishing official images; the frozen Bitnami build is the same server.
MINIO_IMAGE=bitnamilegacy/minio
mkdir "$WORK/certs" && mv "$WORK/public.crt" "$WORK/private.key" "$WORK/certs/"
docker run -d --name "$MINIO" --network "$NET" --network-alias minio --user 0 \
  -e MINIO_ROOT_USER="$MINIO_USER" -e MINIO_ROOT_PASSWORD="$MINIO_PASS" \
  -v "$WORK/certs:/certs:ro" --entrypoint /opt/bitnami/minio/bin/minio \
  "$MINIO_IMAGE" server /tmp/data --certs-dir /certs >/dev/null
for _ in $(seq 1 30); do
  docker run --rm --network "$NET" --entrypoint sh "$MINIO_IMAGE" -c \
    "MC=/opt/bitnami/minio-client/bin/mc; \$MC --insecure alias set l https://minio:9000 $MINIO_USER $MINIO_PASS >/dev/null && \$MC --insecure mb --ignore-existing l/drill" \
    >/dev/null 2>&1 && break
  sleep 1
done

cp "$ROOT/docker-compose.prod.yml" "$WORK/"
printf '%s\n' 'PANEL_DOMAIN=x.test' 'SITE_DOMAIN=z.test' >"$WORK/.env"
touch "$WORK/.env.tunnel"
touch "$WORK/.env.app"
# Compose requires the app env file to exist even though only postgres and backup start.
sed -i 's|env_file: .env$|env_file: .env.app|' "$WORK/docker-compose.prod.yml"
printf '%s\n' 'networks:' '  private:' "    name: $NET" '    external: true' >"$WORK/override.yml"
{
  echo "POSTGRES_PASSWORD=$(openssl rand -hex 12)"
  echo "APP_MIGRATOR_PASSWORD=$(openssl rand -hex 12)"
  echo "APP_RUNTIME_PASSWORD=$(openssl rand -hex 12)"
  echo 'PGBACKREST_REPO1_S3_ENDPOINT=minio:9000'
  echo 'PGBACKREST_REPO1_S3_BUCKET=drill'
  echo 'PGBACKREST_REPO1_S3_REGION=us-east-1'
  echo "PGBACKREST_REPO1_S3_KEY=$MINIO_USER"
  echo "PGBACKREST_REPO1_S3_KEY_SECRET=$MINIO_PASS"
  echo "PGBACKREST_REPO1_CIPHER_PASS=$(openssl rand -base64 24)"
  echo 'PGBACKREST_REPO1_STORAGE_VERIFY_TLS=n'
  echo 'BACKUP_HOUR_UTC=99'
} >"$WORK/.env.db"

echo '== start postgres + backup'
dc up -d --no-build postgres backup
for _ in $(seq 1 90); do
  dc exec -T backup pgbackrest info 2>/dev/null | grep -q 'full backup:' && break
  sleep 2
done
dc exec -T backup pgbackrest info | grep -q 'full backup:' || { dc logs backup >&2; echo 'FAIL: no full backup' >&2; exit 1; }
echo 'full backup taken'

sql -c 'create table drill_rows (id int primary key, note text)'
sql -c "insert into drill_rows select g, 'before' from generate_series(1, 100) g"
sql -c 'select pg_switch_wal()' >/dev/null
sql -c "insert into drill_rows select g, 'before-too' from generate_series(101, 150) g"
sql -f - <"$ROOT/scripts/row-counts.sql" >"$WORK/expected.txt"
sleep 2
TARGET=$(sql -c "select to_char(clock_timestamp(), 'YYYY-MM-DD HH24:MI:SS.USOF')")
sleep 2
sql -c "insert into drill_rows select g, 'after' from generate_series(151, 175) g"
sql -c 'select pg_switch_wal()' >/dev/null
for _ in $(seq 1 30); do
  [ "$(sql -c "select (last_archived_time > clock_timestamp() - interval '20 seconds')::int from pg_stat_archiver")" = 1 ] && break
  sleep 1
done
echo "target moment: $TARGET (expected: drill_rows=150, live now: $(sql -c 'select count(*) from drill_rows'))"

echo '== restore into a throwaway container'
RESTORE_VERIFY_TLS=n "$ROOT/scripts/restore-pitr.sh" --env-file "$WORK/.env.db" --image "$IMAGE" \
  --network "$NET" --target "$TARGET" --expect-counts "$WORK/expected.txt"
echo 'DRILL PASSED'
