#!/usr/bin/env bash
# EthAI-Guard End-to-End Demo Script
# Orchestrates full demo: services, registration, login, dataset upload, analysis

set -euo pipefail

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DEMO_USER_NAME="Demo User"
DEMO_USER_EMAIL="demo@ethixai.local"
DEMO_USER_PASSWORD="DemoPassword123!"
BACKEND_URL="${BACKEND_URL:-http://localhost:5000}"
FRONTEND_URL="${FRONTEND_URL:-http://localhost:3000}"
DEMO_TIMEOUT=300  # 5 minutes timeout

# Logging
log_info() {
  echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
  echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
  echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
  echo -e "${RED}❌ $1${NC}"
}

# Cleanup on exit
cleanup() {
  log_warning "Demo interrupted or completed. Cleaning up..."
  # Leave docker compose running so user can explore
  log_info "Services still running. Run 'docker compose down' to stop them."
}
trap cleanup EXIT

# Step 1: Start Docker Compose services
log_info "=== STEP 1: Starting Docker Compose Services ==="
cd "$(dirname "$0")/.."
log_info "Building and starting services..."
docker compose up --build -d

log_info "Waiting for backend to be healthy (up to ${DEMO_TIMEOUT}s)..."
START_TIME=$(date +%s)
HEALTHY=false
while [ $(($(date +%s) - START_TIME)) -lt $DEMO_TIMEOUT ]; do
  if curl -sS "$BACKEND_URL/health" 2>/dev/null | grep -q backend; then
    HEALTHY=true
    break
  fi
  sleep 2
done

if [ "$HEALTHY" = false ]; then
  log_error "Backend failed to become healthy after ${DEMO_TIMEOUT}s"
  docker compose logs
  exit 1
fi
log_success "Backend is healthy"

# Step 2: User Registration
log_info ""
log_info "=== STEP 2: Registering User ==="
log_info "Endpoint: POST $BACKEND_URL/auth/register"
log_info "User: $DEMO_USER_EMAIL"

REG_RESPONSE=$(curl -sS -X POST "$BACKEND_URL/auth/register" \
  -H 'Content-Type: application/json' \
  -d "{\"name\":\"$DEMO_USER_NAME\",\"email\":\"$DEMO_USER_EMAIL\",\"password\":\"$DEMO_USER_PASSWORD\"}")

log_info "Response: $REG_RESPONSE"

if echo "$REG_RESPONSE" | grep -q 'userId'; then
  DEMO_USER_ID=$(echo "$REG_RESPONSE" | jq -r .userId)
  log_success "User registered: $DEMO_USER_ID"
else
  log_warning "Registration response: $REG_RESPONSE"
fi

# Step 3: User Login
log_info ""
log_info "=== STEP 3: Logging In ==="
log_info "Endpoint: POST $BACKEND_URL/auth/login"

LOGIN_RESPONSE=$(curl -sS -X POST "$BACKEND_URL/auth/login" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"$DEMO_USER_EMAIL\",\"password\":\"$DEMO_USER_PASSWORD\",\"deviceName\":\"Demo Device\"}")

log_info "Response: $LOGIN_RESPONSE"

ACCESS_TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r .accessToken)
REFRESH_TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r .refreshToken)

if [ -z "$ACCESS_TOKEN" ] || [ "$ACCESS_TOKEN" = "null" ]; then
  log_error "Login failed - no access token received"
  exit 1
fi

log_success "Login successful"
log_info "Access Token (first 50 chars): ${ACCESS_TOKEN:0:50}..."
log_info "Refresh Token (first 50 chars): ${REFRESH_TOKEN:0:50}..."

# Step 4: List Devices
log_info ""
log_info "=== STEP 4: Listing Active Devices ==="
log_info "Endpoint: GET $BACKEND_URL/auth/devices"

DEVICES_RESPONSE=$(curl -sS -X GET "$BACKEND_URL/auth/devices" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

log_info "Response: $DEVICES_RESPONSE"
DEVICE_COUNT=$(echo "$DEVICES_RESPONSE" | jq '.devices | length')
log_success "Found $DEVICE_COUNT active device(s)"

# Step 5: Analyze with Sample Data
log_info ""
log_info "=== STEP 5: Running Fairness Analysis ==="
log_info "Endpoint: POST $BACKEND_URL/analyze"
log_info "Dataset: Synthetic binary classification data (4 samples, 2 features)"

ANALYZE_DATA=$(cat <<'EOF'
{
  "data": {
    "x": [
      [0.1, 0.9],
      [0.3, 0.7],
      [0.8, 0.2],
      [0.9, 0.1]
    ],
    "y": [0, 0, 1, 1],
    "sensitive_attributes": [0, 0, 1, 1]
  },
  "parameters": {
    "model_type": "logistic_regression",
    "sensitive_attribute_name": "sensitive_group",
    "group_0_name": "Group A",
    "group_1_name": "Group B"
  }
}
EOF
)

ANALYZE_RESPONSE=$(curl -sS -X POST "$BACKEND_URL/analyze" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H 'Content-Type: application/json' \
  -d "$ANALYZE_DATA")

log_info "Response: $ANALYZE_RESPONSE"

REPORT_ID=$(echo "$ANALYZE_RESPONSE" | jq -r .reportId)
if [ -z "$REPORT_ID" ] || [ "$REPORT_ID" = "null" ]; then
  log_error "Analysis failed - no report ID received"
  exit 1
fi

log_success "Analysis completed: Report ID $REPORT_ID"

# Step 6: Retrieve Report
log_info ""
log_info "=== STEP 6: Retrieving Analysis Report ==="
log_info "Endpoint: GET $BACKEND_URL/reports/$REPORT_ID"

sleep 2  # Give backend time to process
REPORT_RESPONSE=$(curl -sS -X GET "$BACKEND_URL/reports/$REPORT_ID" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

log_info "Report summary:"
echo "$REPORT_RESPONSE" | jq '.' | head -30

log_success "Report retrieved successfully"

# Step 7: Display Summary
log_info ""
log_info "=== STEP 7: Demo Summary ==="
echo ""
log_success "✨ Full end-to-end demo completed successfully! ✨"
echo ""
echo "📊 Summary:"
echo "   User Email:        $DEMO_USER_EMAIL"
echo "   User ID:           ${DEMO_USER_ID:-N/A}"
echo "   Active Devices:    $DEVICE_COUNT"
echo "   Report ID:         $REPORT_ID"
echo ""
echo "🌐 Access the application:"
echo "   Frontend:          $FRONTEND_URL"
echo "   Backend API:       $BACKEND_URL"
echo "   Health Check:      $BACKEND_URL/health"
echo "   Metrics:           $BACKEND_URL/metrics"
echo ""
echo "📝 Test the API:"
echo "   curl -H \"Authorization: Bearer $ACCESS_TOKEN\" \\"
echo "     $BACKEND_URL/analyze"
echo ""
echo "🛑 When done, run:"
echo "   docker compose down"
echo ""
log_success "Demo complete!"
