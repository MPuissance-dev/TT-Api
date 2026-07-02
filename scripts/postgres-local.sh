#!/usr/bin/env bash

set -euo pipefail

CONTAINER_NAME="${PODMAN_POSTGRES_CONTAINER:-tt-postgres}"
VOLUME_NAME="${PODMAN_POSTGRES_VOLUME:-tt-postgres-data}"
POSTGRES_USER="${POSTGRES_USER:-postgres}"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-postgres}"
POSTGRES_DB="${POSTGRES_DB:-mellinet-DB}"
POSTGRES_PORT="${POSTGRES_PORT:-5433}"
POSTGRES_IMAGE="${PODMAN_POSTGRES_IMAGE:-docker.io/library/postgres:16}"

database_url() {
  printf 'postgres://%s:%s@localhost:%s/%s\n' \
    "$POSTGRES_USER" \
    "$POSTGRES_PASSWORD" \
    "$POSTGRES_PORT" \
    "$POSTGRES_DB"
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

usage() {
  cat <<EOF
Usage: bash scripts/postgres-local.sh <commande>

Commandes:
  up       Cree ou demarre Postgres local
  down     Arrete Postgres local
  status   Affiche le statut du conteneur
  logs     Suit les logs PostgreSQL
  url      Affiche la DATABASE_URL
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
