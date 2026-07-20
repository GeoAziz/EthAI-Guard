#!/bin/sh
# Alertmanager entrypoint: substitute env vars into config template
# Alertmanager YAML doesn't natively support env var expansion

set -e

TEMPLATE="/etc/alertmanager/alertmanager.yml.tmpl"
OUTPUT="/etc/alertmanager/alertmanager.yml"

if [ -f "$TEMPLATE" ]; then
  envsubst < "$TEMPLATE" > "$OUTPUT"
  echo "Alertmanager config templated successfully"
fi

exec /bin/alertmanager \
  --config.file="$OUTPUT" \
  --storage.path=/alertmanager \
  "$@"
