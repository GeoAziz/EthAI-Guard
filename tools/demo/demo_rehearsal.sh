#!/bin/bash
# Demo Rehearsal Script - Complete Pre-Presentation Checklist
# Run this before every demo or presentation

set -euo pipefail

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

echo -e "${BLUE}${BOLD}"
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                                                                ║"
echo "║         EthixAI Demo Rehearsal & Validation Script            ║"
echo "║                                                                ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo -e "${NC}"
echo ""

# Configuration
BACKEND_URL="http://localhost:5000"
AI_CORE_URL="http://localhost:8100"
FRONTEND_URL="http://localhost:3000"
DEMO_DATA_FILE="docs/example_data/demo_loan_dataset.csv"

# Track validation results
total_checks=0
passed_checks=0

check_result() {
    total_checks=$((total_checks + 1))
    if [ $1 -eq 0 ]; then
        passed_checks=$((passed_checks + 1))
        echo -e "  ${GREEN}✓${NC} $2"
        return 0
    else
        echo -e "  ${RED}✗${NC} $2"
        return 1
    fi
}

echo -e "${CYAN}${BOLD}[Phase 1] Pre-Demo System Validation${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# 1. Docker Services
echo -e "${YELLOW}Checking Docker Services...${NC}"
if docker ps --format "{{.Names}}" | grep -q "ethai-system_api"; then
    check_result 0 "Backend container running"
else
    check_result 1 "Backend container NOT running"
fi

if docker ps --format "{{.Names}}" | grep -q "ethai-ai_core"; then
    check_result 0 "AI Core container running"
else
    check_result 1 "AI Core container NOT running"
fi

if docker ps --format "{{.Names}}" | grep -q "ethai-frontend"; then
    check_result 0 "Frontend container running"
else
    check_result 1 "Frontend container NOT running"
fi

if docker ps --format "{{.Names}}" | grep -q "ethai-mongo"; then
    check_result 0 "MongoDB container running"
else
    check_result 1 "MongoDB container NOT running"
fi

if docker ps --format "{{.Names}}" | grep -q "ethai-postgres"; then
    check_result 0 "PostgreSQL container running"
else
    check_result 1 "PostgreSQL container NOT running"
fi
echo ""

# 2. Health Endpoints
echo -e "${YELLOW}Validating Health Endpoints...${NC}"
if timeout 5 curl -sf "$BACKEND_URL/health" > /dev/null 2>&1; then
    check_result 0 "Backend health endpoint responding"
else
    check_result 1 "Backend health endpoint NOT responding"
fi

if timeout 5 curl -sf "$AI_CORE_URL/health" > /dev/null 2>&1; then
    check_result 0 "AI Core health endpoint responding"
else
    check_result 1 "AI Core health endpoint NOT responding"
fi

if timeout 5 curl -sf "$FRONTEND_URL" > /dev/null 2>&1; then
    check_result 0 "Frontend serving content"
else
    check_result 1 "Frontend NOT serving content"
fi
echo ""

# 3. Demo Assets
echo -e "${YELLOW}Verifying Demo Assets...${NC}"
if [ -f "$DEMO_DATA_FILE" ]; then
    check_result 0 "Demo dataset file exists"
    row_count=$(wc -l < "$DEMO_DATA_FILE")
    if [ "$row_count" -ge 25 ]; then
        check_result 0 "Demo dataset has sufficient rows ($row_count)"
    else
        check_result 1 "Demo dataset has insufficient rows ($row_count)"
    fi
else
    check_result 1 "Demo dataset file NOT found"
fi

if [ -f "tools/demo/full_demo_sequence.sh" ] && [ -x "tools/demo/full_demo_sequence.sh" ]; then
    check_result 0 "Demo script exists and is executable"
else
    check_result 1 "Demo script NOT executable"
fi

if [ -f "tools/demo/performance_test.sh" ] && [ -x "tools/demo/performance_test.sh" ]; then
    check_result 0 "Performance test script ready"
else
    check_result 1 "Performance test script NOT ready"
fi
echo ""

# 4. Documentation
echo -e "${YELLOW}Checking Documentation...${NC}"
if [ -f "DAY30_COMPLETION.md" ]; then
    check_result 0 "Day 30 completion report available"
else
    check_result 1 "Day 30 completion report NOT found"
fi

if [ -f "DAY30_QUICK_REFERENCE.md" ]; then
    check_result 0 "Quick reference guide available"
else
    check_result 1 "Quick reference guide NOT found"
fi

if [ -f "DAY30_COMPLETION_CERTIFICATE.md" ]; then
    check_result 0 "Completion certificate available"
else
    check_result 1 "Completion certificate NOT found"
fi
echo ""

# 5. API Endpoints Test
echo -e "${YELLOW}Testing Key API Endpoints...${NC}"
if timeout 5 curl -sf "$BACKEND_URL/metrics" | grep -q "http_requests_total" > /dev/null 2>&1; then
    check_result 0 "Backend metrics endpoint functional"
else
    check_result 1 "Backend metrics endpoint issues"
fi

if timeout 5 curl -sfL "$AI_CORE_URL/metrics" | grep -q "process_cpu_seconds_total" > /dev/null 2>&1; then
    check_result 0 "AI Core metrics endpoint functional"
else
    check_result 1 "AI Core metrics endpoint issues"
fi
echo ""

# 6. Performance Check
echo -e "${YELLOW}Quick Performance Check...${NC}"
start=$(date +%s.%N)
timeout 5 curl -sf "$BACKEND_URL/health" > /dev/null 2>&1
end=$(date +%s.%N)
duration=$(echo "$end - $start" | bc)
duration_ms=$(echo "$duration * 1000" | bc | cut -d'.' -f1)

if [ "$duration_ms" -lt 100 ]; then
    check_result 0 "Health endpoint response time: ${duration_ms}ms (excellent)"
elif [ "$duration_ms" -lt 500 ]; then
    check_result 0 "Health endpoint response time: ${duration_ms}ms (good)"
else
    check_result 1 "Health endpoint response time: ${duration_ms}ms (needs optimization)"
fi
echo ""

# Summary
echo -e "${CYAN}${BOLD}[Phase 2] Demo Rehearsal Checklist${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

echo -e "${BOLD}Demo Talking Points:${NC}"
echo ""
echo -e "  ${BLUE}1. Introduction (30 seconds)${NC}"
echo "     'EthixAI is an open-source ethics engine for financial AI.'"
echo "     'We ensure fairness, transparency, and regulatory compliance.'"
echo ""

echo -e "  ${BLUE}2. Problem Statement (30 seconds)${NC}"
echo "     'Banks face regulatory scrutiny over AI bias.'"
echo "     'Traditional ML lacks explainability and fairness metrics.'"
echo "     'EthixAI provides real-time bias detection and audit trails.'"
echo ""

echo -e "  ${BLUE}3. Live Demo (3 minutes)${NC}"
echo "     a) Navigate to: $FRONTEND_URL"
echo "     b) Register/Login with demo credentials"
echo "     c) Upload: $DEMO_DATA_FILE"
echo "     d) Run Fairness Analysis"
echo "     e) Show Results:"
echo "        - Risk Score Dashboard"
echo "        - Fairness Metrics (Demographic Parity, Equal Opportunity)"
echo "        - SHAP Explainability"
echo "        - Compliance Report"
echo ""

echo -e "  ${BLUE}4. Technical Highlights (1 minute)${NC}"
echo "     - Sub-25ms response times"
echo "     - Microservices architecture"
echo "     - Prometheus metrics & observability"
echo "     - JWT authentication & RBAC"
echo "     - Production-ready Docker orchestration"
echo ""

echo -e "  ${BLUE}5. Q&A Preparation (1 minute)${NC}"
echo "     Common Questions:"
echo "     Q: 'What fairness metrics do you support?'"
echo "     A: 'Demographic parity, equal opportunity, disparate impact'"
echo ""
echo "     Q: 'How does explainability work?'"
echo "     A: 'SHAP and LIME for model-agnostic explanations'"
echo ""
echo "     Q: 'Is this production-ready?'"
echo "     A: 'Yes! 92% production readiness, 100% test pass rate'"
echo ""

# Demo URLs
echo -e "${CYAN}${BOLD}[Phase 3] Quick Reference${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${BOLD}Service URLs:${NC}"
echo "  Frontend:       $FRONTEND_URL"
echo "  Backend API:    $BACKEND_URL"
echo "  AI Core:        $AI_CORE_URL"
echo "  Backend Health: $BACKEND_URL/health"
echo "  Metrics:        $BACKEND_URL/metrics"
echo ""

echo -e "${BOLD}Demo Credentials:${NC}"
echo "  Email:    demo@ethixai.com"
echo "  Password: SecureDemo2024!"
echo ""

echo -e "${BOLD}Quick Commands:${NC}"
echo "  Full Demo:       ./tools/demo/full_demo_sequence.sh"
echo "  Performance:     ./tools/demo/performance_test.sh"
echo "  View Logs:       docker logs ethai-system_api-1 --tail 20"
echo "  Restart Backend: docker-compose restart system_api"
echo ""

# Validation Summary
echo -e "${CYAN}${BOLD}[Phase 4] Validation Summary${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

pass_percentage=$((passed_checks * 100 / total_checks))

echo -e "  ${BOLD}Checks Passed:${NC} $passed_checks / $total_checks ($pass_percentage%)"
echo ""

if [ "$pass_percentage" -ge 90 ]; then
    echo -e "${GREEN}${BOLD}✓ SYSTEM READY FOR DEMO${NC}"
    echo -e "${GREEN}  All critical checks passed. You're good to go!${NC}"
    exit_code=0
elif [ "$pass_percentage" -ge 75 ]; then
    echo -e "${YELLOW}${BOLD}⚠ SYSTEM MOSTLY READY${NC}"
    echo -e "${YELLOW}  Some non-critical issues detected. Review and proceed with caution.${NC}"
    exit_code=0
else
    echo -e "${RED}${BOLD}✗ SYSTEM NOT READY${NC}"
    echo -e "${RED}  Critical issues detected. Fix before demo.${NC}"
    exit_code=1
fi
echo ""

echo -e "${CYAN}${BOLD}[Phase 5] Pre-Demo Tips${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "  ${GREEN}✓${NC} Close unnecessary browser tabs"
echo -e "  ${GREEN}✓${NC} Disable desktop notifications"
echo -e "  ${GREEN}✓${NC} Have demo data ready to upload"
echo -e "  ${GREEN}✓${NC} Test screen sharing in advance"
echo -e "  ${GREEN}✓${NC} Have backup screenshots ready"
echo -e "  ${GREEN}✓${NC} Keep Docker Desktop running"
echo -e "  ${GREEN}✓${NC} Have documentation links bookmarked"
echo -e "  ${GREEN}✓${NC} Rehearse transitions between screens"
echo ""

echo -e "${BLUE}${BOLD}Good luck with your presentation! 🚀${NC}"
echo ""

exit $exit_code
