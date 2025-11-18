#!/usr/bin/env python3
"""
Analyze Artillery stress test results and generate comprehensive report
"""
import json
import sys
from pathlib import Path
from datetime import datetime

def analyze_report(report_file):
    """Analyze Artillery JSON report and generate summary"""

    def get_counter(agg, key, default=0):
        # v2 JSON nests counters under aggregate.counters
        if isinstance(agg.get('counters'), dict) and key in agg['counters']:
            return agg['counters'].get(key, default)
        return agg.get(key, default)

    def get_rate(agg, key, default=0.0):
        # v2 JSON nests rates under aggregate.rates
        if isinstance(agg.get('rates'), dict) and key in agg['rates']:
            return agg['rates'].get(key, default)
        return agg.get(key, default)

    def get_summary(agg, name):
        # v2 JSON nests summaries under aggregate.summaries
        if isinstance(agg.get('summaries'), dict) and name in agg['summaries']:
            return agg['summaries'].get(name, {})
        return agg.get(name, {})

    with open(report_file, 'r') as f:
        data = json.load(f)

    # Extract aggregate metrics
    agg = data.get('aggregate', {})

    print("=" * 80)
    print(f"STRESS TEST RESULTS: {Path(report_file).name}")
    print("=" * 80)
    print()

    # Test overview
    print("## Test Overview")
    vusers_created = get_counter(agg, 'vusers.created', 0)
    vusers_completed = get_counter(agg, 'vusers.completed', 0)
    vusers_failed = get_counter(agg, 'vusers.failed', 0)
    print("- Duration: N/A")
    print(f"- Virtual Users Created: {vusers_created:,}")
    print(f"- Virtual Users Completed: {vusers_completed:,}")
    print(f"- Virtual Users Failed: {vusers_failed:,}")
    success_rate = (vusers_completed / vusers_created * 100) if vusers_created else 0.0
    print(f"- Success Rate: {success_rate:.1f}%")
    print()

    # Request metrics
    print("## Request Metrics")
    total_requests = get_counter(agg, 'http.requests', 0)
    request_rate = float(get_rate(agg, 'http.request_rate', 0.0))
    print(f"- Total Requests: {total_requests:,}")
    print(f"- Request Rate: {request_rate:.1f}/sec")
    print()

    # Response times
    rt = get_summary(agg, 'http.response_time')
    print("## Response Time (ms)")
    print(f"- Min: {rt.get('min', 0)}ms")
    print(f"- Median: {rt.get('median', rt.get('p50', 0))}ms")
    print(f"- Mean: {rt.get('mean', 0):.1f}ms")
    print(f"- p95: {rt.get('p95', 0)}ms")
    print(f"- p99: {rt.get('p99', 0)}ms")
    print(f"- Max: {rt.get('max', 0)}ms")
    print()

    # Status codes
    print("## HTTP Status Codes")
    status_codes = {}
    counters = agg.get('counters') if isinstance(agg.get('counters'), dict) else agg
    for k, v in counters.items():
        if k.startswith('http.codes.'):
            status_codes[k] = v
    for code, count in sorted(status_codes.items()):
        code_num = code.replace('http.codes.', '')
        pct = (count / (total_requests or 1)) * 100
        print(f"- {code_num}: {count:,} ({pct:.1f}%)")
    print()

    # Errors
    errors = {}
    for k, v in counters.items():
        if k.startswith('errors.'):
            errors[k] = v
    if errors:
        print("## Errors")
        for error, count in sorted(errors.items()):
            error_name = error.replace('errors.', '')
            print(f"- {error_name}: {count:,}")
        print()

    # Per-endpoint metrics
    print("## Per-Endpoint Performance (p95 response time)")
    endpoint_metrics = {}
    summaries = agg.get('summaries') if isinstance(agg.get('summaries'), dict) else agg
    for key, val in summaries.items():
        if 'plugins.metrics-by-endpoint' in key and 'response_time' in key and isinstance(val, dict):
            parts = key.split('.')
            # Endpoint should be the last segment (e.g., /api/analyze)
            endpoint = parts[-1] if parts else key
            endpoint_metrics[endpoint] = val

    for endpoint, metrics in sorted(endpoint_metrics.items()):
        p95 = metrics.get('p95', 'N/A')
        mean = metrics.get('mean', 'N/A')
        print(f"- {endpoint}: p95={p95}ms, mean={mean}ms")

    # Assessment
    print()
    print("=" * 80)
    print("## Performance Assessment")
    print("=" * 80)

    # Check SLO targets
    p95_target = 2000  # 2 seconds
    p95_actual = rt.get('p95', 0)

    if p95_actual <= p95_target:
        print(f"✅ PASS: p95 latency ({p95_actual}ms) is within target (<{p95_target}ms)")
    else:
        print(f"❌ FAIL: p95 latency ({p95_actual}ms) exceeds target (<{p95_target}ms)")

    if success_rate >= 95:
        print(f"✅ PASS: Success rate ({success_rate:.1f}%) meets target (>95%)")
    elif success_rate >= 80:
        print(f"⚠️  WARN: Success rate ({success_rate:.1f}%) is acceptable but below ideal (>95%)")
    else:
        print(f"❌ FAIL: Success rate ({success_rate:.1f}%) is below acceptable threshold (>80%)")

    # Check for rate limiting
    rate_limit_errors = get_counter(agg, 'http.codes.429', 0)
    if rate_limit_errors > 0:
        pct = (rate_limit_errors / (total_requests or 1)) * 100
        print(f"⚠️  Rate limiting detected: {rate_limit_errors:,} 429 errors ({pct:.1f}%)")
    else:
        print("✅ No rate limiting detected")

    print()

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: python analyze_results.py <report.json>")
        sys.exit(1)
    
    report_file = sys.argv[1]
    if not Path(report_file).exists():
        print(f"Error: File {report_file} not found")
        sys.exit(1)
    
    analyze_report(report_file)
