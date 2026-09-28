#!/usr/bin/env bash

set -euo pipefail

CONTAINER_NAME="${PODMAN_POSTGRES_CONTAINER:-tt-postgres}"
VOLUME_NAME="${PODMAN_POSTGRES_VOLUME:-tt-postgres-data}"
POSTGRES_USER="${POSTGRES_USER:-postgres}"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-postgres}"
POSTGRES_DB="${POSTGRES_DB:-mellinet-DB}"
POSTGRES_TEST_DB="${POSTGRES_TEST_DB:-mellinet-DB-test}"
POSTGRES_PORT="${POSTGRES_PORT:-5433}"
POSTGRES_IMAGE="${PODMAN_POSTGRES_IMAGE:-docker.io/library/postgres:16}"

database_url() {
  printf 'postgres://%s:%s@localhost:%s/%s\n' \
    "$POSTGRES_USER" \
    "$POSTGRES_PASSWORD" \
    "$POSTGRES_PORT" \
    "${1:-$POSTGRES_DB}"
}

container_exists() {
  podman container exists "$CONTAINER_NAME"
}

container_running() {
  [ "$(podman inspect -f '{{.State.Running}}' "$CONTAINER_NAME" 2>/dev/null)" = "true" ]
}

ensure_volume() {
  if ! podman volume exists "$VOLUME_NAME"; then
    podman volume create "$VOLUME_NAME" >/dev/null
  fi
}

wait_until_ready() {
  local attempts=0

  until podman exec "$CONTAINER_NAME" pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB" >/dev/null 2>&1; do
    attempts=$((attempts + 1))
    if [ "$attempts" -ge 30 ]; then
      echo "Postgres n'est pas pret apres 30 secondes." >&2
      exit 1
    fi
    sleep 1
  done
}

up() {
  if container_exists; then
    if container_running; then
      echo "Postgres local est deja demarre."
    else
      podman start "$CONTAINER_NAME" >/dev/null
      echo "Postgres local demarre."
    fi
  else
    ensure_volume
    podman run -d \
      --name "$CONTAINER_NAME" \
      -e "POSTGRES_USER=$POSTGRES_USER" \
      -e "POSTGRES_PASSWORD=$POSTGRES_PASSWORD" \
      -e "POSTGRES_DB=$POSTGRES_DB" \
      -p "$POSTGRES_PORT:5432" \
      -v "$VOLUME_NAME:/var/lib/postgresql/data" \
      "$POSTGRES_IMAGE" >/dev/null
    echo "Postgres local cree et demarre."
  fi

  wait_until_ready
  echo "DATABASE_URL=$(database_url)"
}

# Cree la base de test a cote de la base de dev, pour que les tests ne la touchent jamais.
ensure_test_database() {
  up >/dev/null
  if ! podman exec "$CONTAINER_NAME" psql -U "$POSTGRES_USER" -d postgres -tAc \
    "SELECT 1 FROM pg_database WHERE datname = '$POSTGRES_TEST_DB'" | grep -q 1; then
    podman exec "$CONTAINER_NAME" createdb -U "$POSTGRES_USER" "$POSTGRES_TEST_DB"
    echo "Base de test $POSTGRES_TEST_DB creee."
  fi
}

down() {
  if ! container_exists; then
    echo "Le conteneur $CONTAINER_NAME n'existe pas."
    return
  fi

  if container_running; then
    podman stop "$CONTAINER_NAME" >/dev/null
    echo "Postgres local arrete."
  else
    echo "Postgres local est deja arrete."
  fi
}

status() {
  if ! container_exists; then
    echo "Postgres local n'est pas encore cree."
    return
  fi

  podman ps -a --filter "name=^${CONTAINER_NAME}$"
}

logs() {
  if ! container_exists; then
    echo "Le conteneur $CONTAINER_NAME n'existe pas." >&2
    exit 1
  fi

  podman logs -f "$CONTAINER_NAME"
}

destroy() {
  if container_exists; then
    if container_running; then
      podman stop "$CONTAINER_NAME" >/dev/null
    fi
    podman rm "$CONTAINER_NAME" >/dev/null
  fi

  if podman volume exists "$VOLUME_NAME"; then
    podman volume rm "$VOLUME_NAME" >/dev/null
  fi

  echo "Postgres local supprime."
}

reset() {
  destroy
  up
}

url() {
  if [ "${2:-}" = "--raw" ] || [ "${1:-}" = "--raw" ]; then
    database_url
    return
  fi

  echo "DATABASE_URL=$(database_url)"
}

test_url() {
  if [ "${2:-}" = "--raw" ] || [ "${1:-}" = "--raw" ]; then
    database_url "$POSTGRES_TEST_DB"
    return
  fi

  echo "DATABASE_URL=$(database_url "$POSTGRES_TEST_DB")"
}

usage() {
  cat <<EOF
Usage: bash scripts/postgres-local.sh <commande>

Commandes:
  up       Cree ou demarre Postgres local
  down     Arrete Postgres local
  status   Affiche le statut du conteneur
  logs     Suit les logs PostgreSQL
  url      Affiche la DATABASE_URL
  test-up  Cree ou demarre la base de test ($POSTGRES_TEST_DB)
  test-url Affiche la DATABASE_URL de la base de test
  reset    Recree completement la base locale
  destroy  Supprime le conteneur et son volume
EOF
}

case "${1:-}" in
  up)
    up
    ;;
  down)
    down
    ;;
  status)
    status
    ;;
  logs)
    logs
    ;;
  url)
    url "$@"
    ;;
  test-up)
    ensure_test_database
    ;;
  test-url)
    test_url "$@"
    ;;
  reset)
    reset
    ;;
  destroy)
    destroy
    ;;
  *)
    usage
    exit 1
    ;;
esac
