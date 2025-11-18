#!/bin/bash
#
# Comprehensive Stress Test Suite Runner
# Orchestrates Artillery load tests with automated metrics collection
#
# Usage: ./run_stress_suite.sh [scenario] [options]
# Examples:
#   ./run_stress_suite.sh baseline
#   ./run_stress_suite.sh realistic-50
#   ./run_stress_suite.sh realistic-100
#   ./run_stress_suite.sh all

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
REPORTS_DIR="${PROJECT_ROOT}/reports"
VENV_PYTHON="${PROJECT_ROOT}/.venv/bin/python"
METRICS_COLLECTOR="${SCRIPT_DIR}/collect_metrics.py"
RESULTS_ANALYZER="${SCRIPT_DIR}/analyze_results.py"
HTML_GENERATOR="${SCRIPT_DIR}/generate_html_report.py"

BACKEND_URL="${BACKEND_URL:-http://localhost:5000}"
AICORE_URL="${AICORE_URL:-http://localhost:8100}"

# Ensure reports directory exists
mkdir -p "${REPORTS_DIR}"

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check dependencies
check_dependencies() {
    log_info "Checking dependencies..."
    
    if ! command -v artillery &> /dev/null; then
        log_error "Artillery is not installed. Install with: npm install -g artillery@latest"
        exit 1
    fi
    
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed"
        exit 1
    fi
    
    if [[ ! -f "${VENV_PYTHON}" ]]; then
        log_error "Python venv not found at ${VENV_PYTHON}"
        exit 1
    fi
    
    log_success "All dependencies present"
}

# Check service health
check_services() {
    log_info "Checking service health..."
    
    if ! curl -sf "${BACKEND_URL}/health" > /dev/null; then
        log_error "Backend service not healthy at ${BACKEND_URL}/health"
        return 1
    fi
    
    if ! curl -sf "${AICORE_URL}/health" > /dev/null; then
        log_error "AI Core service not healthy at ${AICORE_URL}/health"
        return 1
    fi
    
    log_success "All services healthy"
    return 0
}

# Collect metrics snapshot
collect_metrics() {
    local timestamp="$1"
    local output_file="${REPORTS_DIR}/metrics_${timestamp}.json"
    
    log_info "Collecting metrics snapshot..."
    
    "${VENV_PYTHON}" "${METRICS_COLLECTOR}" \
        --mode scrape \
        --backend-metrics-url "${BACKEND_URL}/metrics" \
        --aicore-metrics-url "${AICORE_URL}/metrics/" \
        --output "${output_file}"
    
    log_success "Metrics saved to ${output_file}"
}

# Run Artillery scenario
run_artillery_test() {
    local scenario="$1"
    local scenario_file="${SCRIPT_DIR}/artillery_${scenario}.yml"
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local output_file="${REPORTS_DIR}/stress_${scenario}_${timestamp}_report.json"
    
    if [[ ! -f "${scenario_file}" ]]; then
        log_error "Scenario file not found: ${scenario_file}"
        return 1
    fi
    
    log_info "Running Artillery scenario: ${scenario}"
    log_info "Output: ${output_file}"
    
    # Collect pre-test metrics
    collect_metrics "${scenario}_${timestamp}_start"
    
    # Save start timestamp
    date -Iseconds > "${REPORTS_DIR}/stress_${scenario}_${timestamp}_start.txt"
    
    # Run Artillery test
    artillery run \
        --output "${output_file}" \
        "${scenario_file}"
    
    local exit_code=$?
    
    # Save end timestamp
    date -Iseconds > "${REPORTS_DIR}/stress_${scenario}_${timestamp}_end.txt"
    
    # Collect post-test metrics
    collect_metrics "${scenario}_${timestamp}_end"
    
    if [[ ${exit_code} -ne 0 ]]; then
        log_error "Artillery test failed with exit code ${exit_code}"
        return ${exit_code}
    fi
    
    # Analyze results
    log_info "Analyzing results..."
    local summary_file="${REPORTS_DIR}/stress_${scenario}_${timestamp}_summary.txt"
    
    "${VENV_PYTHON}" "${RESULTS_ANALYZER}" \
        --input "${output_file}" \
        --output "${summary_file}"
    
    # Generate HTML report
    log_info "Generating HTML report..."
    local html_file="${REPORTS_DIR}/stress_${scenario}_${timestamp}_report.html"
    
    "${VENV_PYTHON}" "${HTML_GENERATOR}" \
        --input "${output_file}" \
        --output "${html_file}" \
        --title "Stress Test: ${scenario}"
    
    log_success "Test complete!"
    log_success "  - JSON: ${output_file}"
    log_success "  - Summary: ${summary_file}"
    log_success "  - HTML: ${html_file}"
    
    # Display summary
    if [[ -f "${summary_file}" ]]; then
        echo ""
        cat "${summary_file}"
    fi
    
    return 0
}

# Run all scenarios
run_all_scenarios() {
    local scenarios=("baseline" "realistic_50" "realistic_100")
    local failed=0
    
    log_info "Running all stress test scenarios..."
    
    for scenario in "${scenarios[@]}"; do
        log_info "Starting scenario: ${scenario}"
        
        if run_artillery_test "${scenario}"; then
            log_success "Scenario ${scenario} completed"
        else
            log_error "Scenario ${scenario} failed"
            ((failed++))
        fi
        
        # Brief pause between tests
        if [[ "${scenario}" != "${scenarios[-1]}" ]]; then
            log_info "Waiting 30 seconds before next scenario..."
            sleep 30
        fi
    done
    
    echo ""
    if [[ ${failed} -eq 0 ]]; then
        log_success "All scenarios completed successfully!"
        return 0
    else
        log_warning "${failed} scenario(s) failed"
        return 1
    fi
}

# Display usage
usage() {
    cat <<EOF
Usage: $0 [scenario] [options]

Scenarios:
  baseline         Run baseline stress test
  realistic-50     Run realistic test with 50 req/s
  realistic-100    Run realistic test with 100 req/s
  all              Run all scenarios sequentially

Options:
  -h, --help       Show this help message
  --skip-health    Skip health checks
  --backend URL    Override backend URL (default: http://localhost:5000)
  --aicore URL     Override AI Core URL (default: http://localhost:8100)

Examples:
  $0 baseline
  $0 realistic-50
  $0 all
  $0 realistic-100 --backend http://prod.example.com:5000

EOF
}

# Main entry point
main() {
    local scenario="${1:-}"
    local skip_health=false
    
    # Parse arguments
    shift || true
    while [[ $# -gt 0 ]]; do
        case "$1" in
            -h|--help)
                usage
                exit 0
                ;;
            --skip-health)
                skip_health=true
                shift
                ;;
            --backend)
                BACKEND_URL="$2"
                shift 2
                ;;
            --aicore)
                AICORE_URL="$2"
                shift 2
                ;;
            *)
                log_error "Unknown option: $1"
                usage
                exit 1
                ;;
        esac
    done
    
    if [[ -z "${scenario}" ]]; then
        log_error "No scenario specified"
        usage
        exit 1
    fi
    
    echo ""
    log_info "╔═══════════════════════════════════════════════════════════════╗"
    log_info "║         EthixAI Stress Test Suite Runner                     ║"
    log_info "╚═══════════════════════════════════════════════════════════════╝"
    echo ""
    log_info "Backend: ${BACKEND_URL}"
    log_info "AI Core: ${AICORE_URL}"
    log_info "Reports: ${REPORTS_DIR}"
    echo ""
    
    # Check dependencies
    check_dependencies
    
    # Check service health
    if [[ "${skip_health}" == "false" ]]; then
        if ! check_services; then
            log_error "Services not healthy. Use --skip-health to bypass."
            exit 1
        fi
    else
        log_warning "Skipping health checks"
    fi
    
    echo ""
    
    # Run scenario(s)
    case "${scenario}" in
        baseline)
            run_artillery_test "baseline"
            ;;
        realistic-50|realistic_50)
            run_artillery_test "realistic_50"
            ;;
        realistic-100|realistic_100)
            run_artillery_test "realistic_100"
            ;;
        all)
            run_all_scenarios
            ;;
        *)
            log_error "Unknown scenario: ${scenario}"
            usage
            exit 1
            ;;
    esac
    
    local exit_code=$?
    
    echo ""
    if [[ ${exit_code} -eq 0 ]]; then
        log_success "╔═══════════════════════════════════════════════════════════════╗"
        log_success "║              Stress Test Suite Complete!                     ║"
        log_success "╚═══════════════════════════════════════════════════════════════╝"
    else
        log_error "╔═══════════════════════════════════════════════════════════════╗"
        log_error "║            Stress Test Suite Failed                          ║"
        log_error "╚═══════════════════════════════════════════════════════════════╝"
    fi
    echo ""
    
    exit ${exit_code}
}

# Run main if executed directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
