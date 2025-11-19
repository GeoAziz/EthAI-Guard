#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://127.0.0.1:5053}"
TS=$(date +%s)
EMAIL="smk_${TS}@example.com"
PASS="Passw0rd__${TS}__"

parse_field() {
	node -e "(async()=>{let d='';for await (const c of process.stdin)d+=c;const j=JSON.parse(d);const k=process.argv[1];if(k.includes('.')){const ps=k.split('.');let v=j;for(const p of ps){v=v?.[p]}console.log(v??'')}else{console.log(j[k]??'')}})().catch(()=>process.exit(1))" "$1"
}

echo "[smoke] Registering $EMAIL"
REG_JSON=$(curl -sS -X POST "$BASE_URL/auth/register" -H 'content-type: application/json' --data "{\"name\":\"Smoke\",\"email\":\"$EMAIL\",\"password\":\"$PASS\"}")
USER_ID=$(printf '%s' "$REG_JSON" | parse_field userId)
if [[ -z "$USER_ID" ]]; then echo "[smoke] register failed: $REG_JSON"; exit 1; fi

echo "[smoke] Logging in"
LOGIN_JSON=$(curl -sS -X POST "$BASE_URL/auth/login" -H 'content-type: application/json' --data "{\"email\":\"$EMAIL\",\"password\":\"$PASS\",\"deviceName\":\"Smoke Device\"}")
ACCESS=$(printf '%s' "$LOGIN_JSON" | parse_field accessToken)
RTOKEN=$(printf '%s' "$LOGIN_JSON" | parse_field refreshToken)
if [[ -z "$ACCESS" || -z "$RTOKEN" ]]; then echo "[smoke] login failed: $LOGIN_JSON"; exit 1; fi

echo "[smoke] Uploading dataset"
UPLOAD_JSON=$(curl -sS -X POST "$BASE_URL/datasets/upload" -H "content-type: application/json" -H "authorization: Bearer $ACCESS" --data '{"name":"demo","type":"csv"}')

echo "[smoke] Listing reports"
REPORTS_JSON=$(curl -sS "$BASE_URL/reports/$USER_ID" -H "authorization: Bearer $ACCESS")

echo "[smoke] Refreshing token (rotate)"
REFRESH1_JSON=$(curl -sS -X POST "$BASE_URL/auth/refresh" -H 'content-type: application/json' --data "{\"refreshToken\":\"$RTOKEN\"}")
NEW_ACCESS=$(printf '%s' "$REFRESH1_JSON" | parse_field accessToken)
NEW_REFRESH=$(printf '%s' "$REFRESH1_JSON" | parse_field refreshToken)
if [[ -z "$NEW_ACCESS" || -z "$NEW_REFRESH" ]]; then echo "[smoke] refresh1 failed: $REFRESH1_JSON"; exit 1; fi

echo "[smoke] Old refresh should now be invalid"
OLD_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/auth/refresh" -H 'content-type: application/json' --data "{\"refreshToken\":\"$RTOKEN\"}")
if [[ "$OLD_STATUS" != "401" ]]; then echo "[smoke] expected 401 on old refresh, got $OLD_STATUS"; exit 1; fi

echo "[smoke] Analyze (fallback)"
ANALYZE_JSON=$(curl -sS -X POST "$BASE_URL/analyze" -H "content-type: application/json" -H "authorization: Bearer $NEW_ACCESS" --data '{"dataset_name":"demo","data":{"age":[25,31,44]}}')

echo "[smoke] OK: user=$USER_ID"
echo "$ANALYZE_JSON"
exit 0
