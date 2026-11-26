# Production Postgres: the same base image as development plus pgBackRest (RN-10, RN-11).
# The alpine package is pinned; if the mirror drops this revision, bump it with the matching alpine tag.
FROM postgres:18.7-alpine@sha256:0115267ab5a509022df9319c77be365cef335adb71556c75f60f5360ee247e71
RUN apk add --no-cache pgbackrest=2.58.0-r0
COPY init-prod.sh /docker-entrypoint-initdb.d/10-roles.sh
COPY backup-loop.sh wal-health.sh /usr/local/bin/
RUN chmod 0755 /usr/local/bin/backup-loop.sh /usr/local/bin/wal-health.sh \
  && mkdir -p /var/log/pgbackrest /tmp/pgbackrest \
  && chown postgres:postgres /var/log/pgbackrest /tmp/pgbackrest
