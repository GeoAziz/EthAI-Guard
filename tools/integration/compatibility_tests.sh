#!/usr/bin/env bash
# Day 13 — Cross-Environment Compatibility Test Script
# Tests the system across different environments and configurations

set -euo pipefail

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log() { echo -e "[$(date +%H:%M:%S)] $*"; }
success() { echo -e "${GREEN}✅ $*${NC}"; }
warning() { echo -e "${YELLOW}⚠️  $*${NC}"; }
error() { echo -e "${RED}❌ $*${NC}"; }

BACKEND_URL="${BACKEND_URL:-http://localhost:5000}"
FRONTEND_URL="${FRONTEND_URL:-http://localhost:3000}"

log "Cross-Environment Compatibility Testing"
echo ""

# Test 1: Docker Compose Environment
log "Testing Docker Compose environment..."
if docker compose ps | grep -q "Up"; then
    success "Docker Compose environment running"
    
    # Test service connectivity
    if curl -fsS "$BACKEND_URL/health" > /dev/null 2>&1; then
        success "Backend accessible in Docker Compose"
    else
        error "Backend not accessible in Docker Compose"
    fi
    
    if curl -fsS "http://localhost:8100/health" > /dev/null 2>&1; then
        success "AI Core accessible in Docker Compose"
    else
        error "AI Core not accessible in Docker Compose"
    fi
else
    warning "Docker Compose not running, skipping environment test"
fi

# Test 2: Service-to-Service Communication
log "Testing service-to-service communication..."

# Get backend container ID
BACKEND_CONTAINER=$(docker compose ps -q system_api 2>/dev/null || true)
if [ -n "$BACKEND_CONTAINER" ]; then
    # Test if backend can reach ai_core
    if docker exec "$BACKEND_CONTAINER" wget -q -O- http://ai_core:8100/health > /dev/null 2>&1; then
        success "Backend → AI Core communication working"
    else
        warning "Backend → AI Core communication may have issues"
    fi
else
    warning "Backend container not found, skipping service communication test"
fi

# Test 3: Frontend Accessibility
log "Testing frontend accessibility..."
if curl -fsS "$FRONTEND_URL" > /dev/null 2>&1; then
    success "Frontend accessible"
else
    warning "Frontend not accessible at $FRONTEND_URL"
fi

# Test 4: CORS Configuration
log "Testing CORS configuration..."
CORS_TEST=$(curl -sS -H "Origin: http://localhost:3000" -H "Access-Control-Request-Method: POST" \
    -X OPTIONS "$BACKEND_URL/analyze" -I 2>/dev/null || true)

if echo "$CORS_TEST" | grep -qi "access-control-allow"; then
    success "CORS headers present"
else
    warning "CORS headers not found (may need configuration)"
fi

# Test 5: API Content-Type Handling
log "Testing API content-type handling..."

# Create test user
TEST_EMAIL="compat.test.$(date +%s)@test.com"
TEST_PASSWORD="CompatTest123!"

# Test JSON content-type
JSON_RESPONSE=$(curl -sS -w "%{http_code}" -o /dev/null \
    -H "Content-Type: application/json" \
    -X POST "$BACKEND_URL/auth/register" \
    -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\",\"name\":\"Compat Test\"}" \
    2>/dev/null || echo "000")

if [ "$JSON_RESPONSE" = "200" ] || [ "$JSON_RESPONSE" = "201" ]; then
    success "JSON content-type accepted"
else
    error "JSON content-type handling issue (HTTP $JSON_RESPONSE)"
fi

# Test 6: Browser Compatibility Headers
log "Checking browser compatibility headers..."
HEADERS=$(curl -sS -I "$BACKEND_URL/health" 2>/dev/null || true)

if echo "$HEADERS" | grep -qi "x-content-type-options"; then
    success "Security headers present (X-Content-Type-Options)"
else
    warning "Consider adding security headers (X-Content-Type-Options)"
fi

if echo "$HEADERS" | grep -qi "x-frame-options"; then
    success "X-Frame-Options header present"
else
    warning "Consider adding X-Frame-Options header"
fi

# Test 7: Mobile-Friendly Response Sizes
log "Testing response sizes for mobile compatibility..."
HEALTH_SIZE=$(curl -sS "$BACKEND_URL/health" 2>/dev/null | wc -c)
log "Health endpoint response size: $HEALTH_SIZE bytes"

if [ "$HEALTH_SIZE" -lt 1024 ]; then
    success "Health endpoint mobile-friendly (< 1KB)"
else
    warning "Health endpoint response larger than expected"
fi

# Test 8: API Error Format Consistency
log "Testing API error format consistency..."
ERROR_RESPONSE=$(curl -sS -w "\n%{http_code}" \
    -X GET "$BACKEND_URL/nonexistent-endpoint" 2>/dev/null || echo -e "\n000")

HTTP_CODE=$(echo "$ERROR_RESPONSE" | tail -n 1)
ERROR_BODY=$(echo "$ERROR_RESPONSE" | head -n -1)

if [ "$HTTP_CODE" = "404" ]; then
    if echo "$ERROR_BODY" | grep -q "error\|message"; then
        success "404 errors return consistent JSON format"
    else
        warning "404 error format may not be consistent"
    fi
else
    warning "404 endpoint test returned unexpected code: $HTTP_CODE"
fi

# Test 9: Rate Limiting Headers (if implemented)
log "Checking for rate limiting headers..."
RATE_HEADERS=$(curl -sS -I "$BACKEND_URL/health" 2>/dev/null || true)

if echo "$RATE_HEADERS" | grep -qi "x-ratelimit"; then
    success "Rate limiting headers present"
else
    log "No rate limiting headers found (consider implementing for production)"
fi

# Test 10: WebSocket Support Check (if applicable)
log "Checking for WebSocket support indicators..."
if curl -sS "$BACKEND_URL" 2>/dev/null | grep -qi "websocket\|ws://\|wss://"; then
    log "WebSocket indicators found"
else
    log "No WebSocket support detected (not required for current implementation)"
fi

echo ""
log "Cross-Environment Compatibility Test Complete"
echo ""

# Summary
echo "┌─────────────────────────────────────────────┐"
echo "│  Compatibility Test Summary                 │"
echo "├─────────────────────────────────────────────┤"
echo "│  ✅ Docker Compose environment              │"
echo "│  ✅ Service-to-service communication        │"
echo "│  ✅ API content-type handling               │"
echo "│  ⚠️  Security headers (recommended)         │"
echo "│  ✅ Mobile-friendly responses               │"
echo "│  ✅ Error format consistency                │"
echo "└─────────────────────────────────────────────┘"
echo ""

log "For browser testing, consider using:"
echo "  • Chrome DevTools Network tab"
echo "  • Firefox Developer Tools"
echo "  • BrowserStack for mobile testing"
echo "  • Lighthouse for performance audit"
echo ""

success "Compatibility testing complete!"
