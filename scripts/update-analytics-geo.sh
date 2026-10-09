#!/usr/bin/env bash
set -euo pipefail
# DB-IP Lite, CC BY 4.0: https://db-ip.com/db/lite.php
# Run from api/, then restart the API to load the updated file.
period="${1:-$(date -u +%Y-%m)}"
[[ "$period" =~ ^[0-9]{4}-[0-9]{2}$ ]] || exit 1
mkdir -p data
temporary="$(mktemp -d data/geo.XXXXXX)"
trap 'rm -rf "$temporary"' EXIT
curl --fail --location --retry 3 --max-time 300 "https://download.db-ip.com/free/dbip-city-lite-${period}.mmdb.gz" -o "$temporary/city.gz"
gzip -dc "$temporary/city.gz" > "$temporary/city.mmdb"
test -s "$temporary/city.mmdb"
mv "$temporary/city.mmdb" data/dbip-city.mmdb
