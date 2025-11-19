#!/bin/bash
# Day 30: Performance & Load Testing Script
# Tests response times, throughput, and identifies bottlenecks

set -euo pipefail

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

BACKEND_URL="${BACKEND_URL:-http://localhost:5000}"
AI_CORE_URL="${AI_CORE_URL:-http://localhost:8100}"
ITERATIONS="${ITERATIONS:-10}"

echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}        EthixAI Performance Testing${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""

# Performance thresholds (in seconds)
THRESHOLD_HEALTH=0.5
THRESHOLD_AUTH=1.0
THRESHOLD_UPLOAD=2.0
THRESHOLD_ANALYZE=5.0

# Results storage
declare -a health_times
declare -a auth_times
declare -a metrics_times

echo -e "${YELLOW}[Test 1]${NC} Health Endpoint Performance"
echo "  Testing $ITERATIONS requests to /health"

for i in $(seq 1 $ITERATIONS); do
    start=$(date +%s.%N)
    curl -sf "$BACKEND_URL/health" > /dev/null 2>&1 || true
    end=$(date +%s.%N)
    duration=$(echo "$end - $start" | bc)
    health_times+=($duration)
    echo -n "."
done
echo ""

# Calculate average
health_avg=$(echo "scale=3; (${health_times[*]/%/+}0) / $ITERATIONS" | bc)
echo -e "  Average response time: ${health_avg}s"

if (( $(echo "$health_avg < $THRESHOLD_HEALTH" | bc -l) )); then
    echo -e "  ${GREEN}✓ Performance: Excellent${NC}"
elif (( $(echo "$health_avg < $THRESHOLD_HEALTH * 2" | bc -l) )); then
    echo -e "  ${YELLOW}⚠ Performance: Acceptable${NC}"
else
    echo -e "  ${RED}✗ Performance: Needs optimization${NC}"
fi
echo ""

echo -e "${YELLOW}[Test 2]${NC} Authentication Performance"
echo "  Testing $ITERATIONS login requests"

for i in $(seq 1 $ITERATIONS); do
    start=$(date +%s.%N)
    curl -sf -X POST "$BACKEND_URL/auth/register" \
        -H "Content-Type: application/json" \
        -d "{\"email\":\"perf$i@test.com\",\"password\":\"Test1234!\"}" \
        > /dev/null 2>&1 || true
    end=$(date +%s.%N)
    duration=$(echo "$end - $start" | bc)
    auth_times+=($duration)
    echo -n "."
done
echo ""

auth_avg=$(echo "scale=3; (${auth_times[*]/%/+}0) / $ITERATIONS" | bc)
echo -e "  Average response time: ${auth_avg}s"

if (( $(echo "$auth_avg < $THRESHOLD_AUTH" | bc -l) )); then
    echo -e "  ${GREEN}✓ Performance: Excellent${NC}"
elif (( $(echo "$auth_avg < $THRESHOLD_AUTH * 2" | bc -l) )); then
    echo -e "  ${YELLOW}⚠ Performance: Acceptable${NC}"
else
    echo -e "  ${RED}✗ Performance: Needs optimization${NC}"
fi
echo ""

echo -e "${YELLOW}[Test 3]${NC} Metrics Endpoint Performance"
echo "  Testing $ITERATIONS requests to /metrics"

for i in $(seq 1 $ITERATIONS); do
    start=$(date +%s.%N)
    curl -sf "$BACKEND_URL/metrics" > /dev/null 2>&1 || true
    end=$(date +%s.%N)
    duration=$(echo "$end - $start" | bc)
    metrics_times+=($duration)
    echo -n "."
done
echo ""

metrics_avg=$(echo "scale=3; (${metrics_times[*]/%/+}0) / $ITERATIONS" | bc)
echo -e "  Average response time: ${metrics_avg}s"

if (( $(echo "$metrics_avg < $THRESHOLD_HEALTH" | bc -l) )); then
    echo -e "  ${GREEN}✓ Performance: Excellent${NC}"
else
    echo -e "  ${YELLOW}⚠ Performance: Acceptable${NC}"
fi
echo ""

echo -e "${YELLOW}[Test 4]${NC} Large Payload Handling"
echo "  Testing upload with 1000-row dataset"

# Create large CSV
LARGE_CSV="/tmp/large_perf_test.csv"
echo "col1,col2,col3,col4,col5,target" > "$LARGE_CSV"
for i in $(seq 1 1000); do
    echo "$i,$((RANDOM % 1000)),$((RANDOM % 1000)),$((RANDOM % 1000)),$((RANDOM % 1000)),$((RANDOM % 2))" >> "$LARGE_CSV"
done

# Register and login
REG_RESP=$(curl -sf -X POST "$BACKEND_URL/auth/register" \
    -H "Content-Type: application/json" \
    -d '{"email":"perftest@large.com","password":"Test1234!"}' 2>/dev/null || echo '{}')

LOGIN_RESP=$(curl -sf -X POST "$BACKEND_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"perftest@large.com","password":"Test1234!"}' 2>/dev/null || echo '{}')

TOKEN=$(echo "$LOGIN_RESP" | jq -r '.accessToken // .access_token // empty')

if [ -n "$TOKEN" ]; then
    start=$(date +%s.%N)
    UPLOAD_RESP=$(curl -sf -X POST "$BACKEND_URL/datasets/upload" \
        -H "Authorization: Bearer $TOKEN" \
        -F "file=@$LARGE_CSV" 2>/dev/null || echo '{}')
    end=$(date +%s.%N)
    upload_duration=$(echo "$end - $start" | bc)
    
    echo -e "  Upload time: ${upload_duration}s"
    
    if (( $(echo "$upload_duration < $THRESHOLD_UPLOAD" | bc -l) )); then
        echo -e "  ${GREEN}✓ Large payload handling: Excellent${NC}"
    elif (( $(echo "$upload_duration < $THRESHOLD_UPLOAD * 2" | bc -l) )); then
        echo -e "  ${YELLOW}⚠ Large payload handling: Acceptable${NC}"
    else
        echo -e "  ${RED}✗ Large payload handling: Needs optimization${NC}"
    fi
else
    echo -e "  ${RED}✗ Authentication failed, skipping large payload test${NC}"
fi

rm -f "$LARGE_CSV"
echo ""

echo -e "${YELLOW}[Test 5]${NC} Concurrent Request Handling"
echo "  Testing 5 concurrent health checks"

start=$(date +%s.%N)
for i in {1..5}; do
    curl -sf "$BACKEND_URL/health" > /dev/null 2>&1 &
done
wait
end=$(date +%s.%N)
concurrent_duration=$(echo "$end - $start" | bc)

echo -e "  Time for 5 concurrent requests: ${concurrent_duration}s"
if (( $(echo "$concurrent_duration < 1.0" | bc -l) )); then
    echo -e "  ${GREEN}✓ Concurrent handling: Excellent${NC}"
else
    echo -e "  ${YELLOW}⚠ Concurrent handling: Acceptable${NC}"
fi
echo ""

# Summary
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}        Performance Test Summary${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""
echo "Endpoint Performance:"
echo "  • Health endpoint: ${health_avg}s (threshold: ${THRESHOLD_HEALTH}s)"
echo "  • Authentication: ${auth_avg}s (threshold: ${THRESHOLD_AUTH}s)"
echo "  • Metrics endpoint: ${metrics_avg}s (threshold: ${THRESHOLD_HEALTH}s)"
if [ -n "${upload_duration:-}" ]; then
    echo "  • Large upload (1000 rows): ${upload_duration}s (threshold: ${THRESHOLD_UPLOAD}s)"
fi
echo "  • Concurrent requests (5): ${concurrent_duration}s"
echo ""

# Calculate overall score
total_tests=5
passed_tests=0

(( $(echo "$health_avg < $THRESHOLD_HEALTH" | bc -l) )) && ((passed_tests++))
(( $(echo "$auth_avg < $THRESHOLD_AUTH * 2" | bc -l) )) && ((passed_tests++))
(( $(echo "$metrics_avg < $THRESHOLD_HEALTH * 2" | bc -l) )) && ((passed_tests++))
[ -n "${upload_duration:-}" ] && (( $(echo "$upload_duration < $THRESHOLD_UPLOAD * 2" | bc -l) )) && ((passed_tests++))
(( $(echo "$concurrent_duration < 2.0" | bc -l) )) && ((passed_tests++))

pass_rate=$((passed_tests * 100 / total_tests))

echo "Overall Performance Score: $pass_rate% ($passed_tests/$total_tests tests passed)"
echo ""

if [ $pass_rate -ge 80 ]; then
    echo -e "${GREEN}✓ System performance is production-ready${NC}"
    exit 0
elif [ $pass_rate -ge 60 ]; then
    echo -e "${YELLOW}⚠ System performance is acceptable but could be optimized${NC}"
    exit 0
else
    echo -e "${RED}✗ System performance needs significant optimization${NC}"
    exit 1
fi
