#!/bin/bash
set -e
cd "$(dirname "$0")"

read -p "Версия: " APP_VERSION
export APP_VERSION

docker compose pull
docker compose up -d
docker compose ps
