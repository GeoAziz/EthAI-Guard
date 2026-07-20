#!/bin/bash

# Email Integration Validation Script
# Validates that all email integration components are properly configured

set -e

echo "🔍 Email Integration Validation"
echo "================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

ERRORS=0
WARNINGS=0

# Helper functions
check_file() {
  if [ -f "$1" ]; then
    echo -e "${GREEN}✓${NC} Found: $1"
    return 0
  else
    echo -e "${RED}✗${NC} Missing: $1"
    ERRORS=$((ERRORS + 1))
    return 1
  fi
}

check_env_var() {
  if grep -q "^# $1\|^$1=" .env.example; then
    echo -e "${GREEN}✓${NC} Environment variable configured: $1"
    return 0
  else
    echo -e "${YELLOW}⚠${NC}  Not found in .env.example: $1"
    WARNINGS=$((WARNINGS + 1))
    return 1
  fi
}

check_route() {
  if grep -q "$1" backend/src/server.js; then
    echo -e "${GREEN}✓${NC} Route registered: $1"
    return 0
  else
    echo -e "${RED}✗${NC} Route not found: $1"
    ERRORS=$((ERRORS + 1))
    return 1
  fi
}

# 1. Check Backend Models
echo "1️⃣  Backend Models"
echo "---"
check_file "backend/src/models/JobApplication.js"
check_file "backend/src/models/JobSubscription.js"
check_file "backend/src/models/NewsletterSubscription.js"
echo ""

# 2. Check Email Service
echo "2️⃣  Email Service"
echo "---"
check_file "backend/src/services/emailService.js"
check_file "backend/src/services/emailTemplates.js"
echo ""

# 3. Check Backend Routes
echo "3️⃣  Backend API Routes"
echo "---"
check_file "backend/src/routes/careers.js"
check_file "backend/src/routes/newsletter.js"
check_route "careers"
check_route "newsletter"
echo ""

# 4. Check Frontend Routes
echo "4️⃣  Frontend API Routes"
echo "---"
check_file "frontend/src/app/api/careers/general-application/route.ts"
check_file "frontend/src/app/api/careers/applications/route.ts"
check_file "frontend/src/app/api/careers/subscribe-jobs/route.ts"
check_file "frontend/src/app/api/newsletter/route.ts"
echo ""

# 5. Check Environment Configuration
echo "5️⃣  Environment Configuration"
echo "---"
check_env_var "EMAIL_PROVIDER"
check_env_var "EMAIL_FROM"
check_env_var "EMAIL_FROM_NAME"
check_env_var "SENDGRID_API_KEY"
check_env_var "DISABLE_EMAIL_SEND"
echo ""

# 6. Check Tests
echo "6️⃣  Test Suite"
echo "---"
check_file "backend/src/__tests__/careers.test.js"
check_file "backend/src/__tests__/emailService.test.js"
echo ""

# 7. Check Documentation
echo "7️⃣  Documentation"
echo "---"
check_file "EMAIL_INTEGRATION_IMPLEMENTATION.md"
echo ""

# 8. Check for code quality
echo "8️⃣  Code Quality Checks"
echo "---"

# Check for TODO comments in critical files
TODOS=$(grep -r "TODO" backend/src/routes/careers.js backend/src/routes/newsletter.js backend/src/services/emailService.js 2>/dev/null | grep -v "node_modules" | wc -l)
if [ "$TODOS" -eq 0 ]; then
  echo -e "${GREEN}✓${NC} No TODO comments in critical files"
else
  echo -e "${YELLOW}⚠${NC}  Found $TODOS TODO comments"
  WARNINGS=$((WARNINGS + 1))
fi

# Check for console.log in production code
CONSOLES=$(grep -r "console\\.log" backend/src/routes/careers.js backend/src/routes/newsletter.js 2>/dev/null | wc -l)
if [ "$CONSOLES" -eq 0 ]; then
  echo -e "${GREEN}✓${NC} No console.log statements in API routes"
else
  echo -e "${YELLOW}⚠${NC}  Found $CONSOLES console.log statements"
fi

echo ""

# Summary
echo "================================"
echo "📋 Summary"
echo "---"
echo -e "Errors: ${RED}$ERRORS${NC}"
echo -e "Warnings: ${YELLOW}$WARNINGS${NC}"
echo ""

if [ $ERRORS -eq 0 ]; then
  echo -e "${GREEN}✓ All critical components found!${NC}"
  echo ""
  echo "Next Steps:"
  echo "1. Run tests: cd backend && npm test -- careers.test.js"
  echo "2. Set SENDGRID_API_KEY in .env"
  echo "3. Start backend: npm start"
  echo "4. Test API endpoints with curl or frontend"
  exit 0
else
  echo -e "${RED}✗ Some components are missing or misconfigured${NC}"
  exit 1
fi
