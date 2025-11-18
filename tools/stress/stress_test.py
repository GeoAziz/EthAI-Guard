#!/usr/bin/env python3
"""
EthixAI Custom Stress Testing Script
Provides fine-grained control over load testing with real-time metrics
"""

import asyncio
import aiohttp  # HTTP client for async requests
import time
import json
import sys
from datetime import datetime
from typing import List, Dict, Any
from dataclasses import dataclass, field
from statistics import mean, median, quantiles
import random

@dataclass
class TestConfig:
    """Test configuration"""
    target_url: str = "http://localhost:5000"
    concurrent_users: int = 10
    duration_seconds: int = 300
    requests_per_user: int = 100
    payload_size: int = 100
    timeout_seconds: int = 30
    
@dataclass
class RequestMetrics:
    """Metrics for a single request"""
    status_code: int
    latency_ms: float
    success: bool
    error: str = ""
    request_id: str = ""
    timestamp: float = field(default_factory=time.time)

@dataclass
class TestResults:
    """Aggregated test results"""
    total_requests: int = 0
    successful_requests: int = 0
    failed_requests: int = 0
    timeout_requests: int = 0
    
    latencies: List[float] = field(default_factory=list)
    status_codes: Dict[int, int] = field(default_factory=dict)
    errors: List[str] = field(default_factory=list)
    
    start_time: float = 0
    end_time: float = 0
    
    def add_result(self, metrics: RequestMetrics):
        """Add individual request result"""
        self.total_requests += 1
        self.latencies.append(metrics.latency_ms)
        
        self.status_codes[metrics.status_code] = self.status_codes.get(metrics.status_code, 0) + 1
        
        if metrics.success:
            self.successful_requests += 1
        else:
            self.failed_requests += 1
            if metrics.error:
                self.errors.append(f"[{metrics.status_code}] {metrics.error}")
    
    def get_summary(self) -> Dict[str, Any]:
        """Get summary statistics"""
        duration = self.end_time - self.start_time
        
        latencies_sorted = sorted(self.latencies)
        
        return {
            "duration_seconds": round(duration, 2),
            "total_requests": self.total_requests,
            "successful_requests": self.successful_requests,
            "failed_requests": self.failed_requests,
            "success_rate": round(self.successful_requests / self.total_requests * 100, 2) if self.total_requests > 0 else 0,
            "requests_per_second": round(self.total_requests / duration, 2) if duration > 0 else 0,
            "latency": {
                "min_ms": round(min(self.latencies), 2) if self.latencies else 0,
                "max_ms": round(max(self.latencies), 2) if self.latencies else 0,
                "mean_ms": round(mean(self.latencies), 2) if self.latencies else 0,
                "median_ms": round(median(self.latencies), 2) if self.latencies else 0,
                "p95_ms": round(quantiles(latencies_sorted, n=20)[18], 2) if len(latencies_sorted) > 1 else 0,
                "p99_ms": round(quantiles(latencies_sorted, n=100)[98], 2) if len(latencies_sorted) > 1 else 0,
            },
            "status_codes": self.status_codes,
            "top_errors": self.errors[:10]
        }


def generate_test_payload(size: int) -> List[Dict[str, Any]]:
    """Generate synthetic credit scoring dataset"""
    genders = ['male', 'female']
    age_groups = ['18-25', '26-35', '36-45', '46-55', '56+']
    ethnicities = ['group_a', 'group_b', 'group_c', 'group_d']
    
    data = []
    for i in range(size):
        data.append({
            'id': f'record_{i}',
            'credit_score': random.randint(500, 900),
            'income': random.randint(30000, 130000),
            'debt_to_income_ratio': round(random.random() * 0.6, 3),
            'employment_years': random.randint(0, 30),
            'existing_credit_lines': random.randint(0, 10),
            'age': random.choice(age_groups),
            'gender': random.choice(genders),
            'ethnicity': random.choice(ethnicities),
            'approved': random.random() > 0.3
        })
    
    return data


async def make_request(session: aiohttp.ClientSession, config: TestConfig, payload: List[Dict]) -> RequestMetrics:
    """Make a single HTTP request"""
    request_id = f"stress-test-{random.randint(100000, 999999)}"
    
    start_time = time.time()
    
    try:
        async with session.post(
            f"{config.target_url}/api/analyze",
            json={
                "model_type": "credit_scoring",
                "dataset": payload,
                "protected_attributes": ["gender", "age"],
                "target_column": "approved"
            },
            headers={
                "Content-Type": "application/json",
                "X-Request-Id": request_id
            },
            timeout=aiohttp.ClientTimeout(total=config.timeout_seconds)
        ) as response:
            latency_ms = (time.time() - start_time) * 1000
            
            # Try to read response body
            try:
                body = await response.json()
                error_msg = body.get('error', body.get('message', ''))
            except:
                error_msg = ""
            
            return RequestMetrics(
                status_code=response.status,
                latency_ms=latency_ms,
                success=200 <= response.status < 300,
                error=error_msg if response.status >= 400 else "",
                request_id=request_id
            )
    
    except asyncio.TimeoutError:
        latency_ms = (time.time() - start_time) * 1000
        return RequestMetrics(
            status_code=504,
            latency_ms=latency_ms,
            success=False,
            error="Request timeout",
            request_id=request_id
        )
    
    except aiohttp.ClientError as e:
        latency_ms = (time.time() - start_time) * 1000
        return RequestMetrics(
            status_code=0,
            latency_ms=latency_ms,
            success=False,
            error=str(e),
            request_id=request_id
        )
    
    except Exception as e:
        latency_ms = (time.time() - start_time) * 1000
        return RequestMetrics(
            status_code=0,
            latency_ms=latency_ms,
            success=False,
            error=str(e),
            request_id=request_id
        )


async def user_session(user_id: int, config: TestConfig, results: TestResults):
    """Simulate a single user making requests"""
    payload = generate_test_payload(config.payload_size)
    
    connector = aiohttp.TCPConnector(limit=10)
    async with aiohttp.ClientSession(connector=connector) as session:
        for request_num in range(config.requests_per_user):
            metrics = await make_request(session, config, payload)
            results.add_result(metrics)
            
            # Print progress
            if request_num % 10 == 0:
                print(f"[User {user_id}] Completed {request_num}/{config.requests_per_user} requests")
            
            # Small delay between requests
            await asyncio.sleep(0.1)


async def run_stress_test(config: TestConfig) -> TestResults:
    """Run the stress test"""
    results = TestResults()
    results.start_time = time.time()
    
    print(f"\n{'='*80}")
    print(f"Starting Stress Test")
    print(f"{'='*80}")
    print(f"Target: {config.target_url}")
    print(f"Concurrent Users: {config.concurrent_users}")
    print(f"Requests per User: {config.requests_per_user}")
    print(f"Payload Size: {config.payload_size} records")
    print(f"Expected Duration: ~{config.duration_seconds} seconds")
    print(f"{'='*80}\n")
    
    # Create tasks for all users
    tasks = [
        user_session(user_id, config, results)
        for user_id in range(config.concurrent_users)
    ]
    
    # Run all user sessions concurrently
    await asyncio.gather(*tasks)
    
    results.end_time = time.time()
    
    return results


def print_results(results: TestResults):
    """Print formatted test results"""
    summary = results.get_summary()
    
    print(f"\n{'='*80}")
    print(f"Test Results")
    print(f"{'='*80}")
    print(f"Duration: {summary['duration_seconds']}s")
    print(f"Total Requests: {summary['total_requests']}")
    print(f"Successful: {summary['successful_requests']} ({summary['success_rate']}%)")
    print(f"Failed: {summary['failed_requests']}")
    print(f"Throughput: {summary['requests_per_second']} req/sec")
    print(f"\nLatency Statistics:")
    print(f"  Min: {summary['latency']['min_ms']}ms")
    print(f"  Mean: {summary['latency']['mean_ms']}ms")
    print(f"  Median: {summary['latency']['median_ms']}ms")
    print(f"  P95: {summary['latency']['p95_ms']}ms")
    print(f"  P99: {summary['latency']['p99_ms']}ms")
    print(f"  Max: {summary['latency']['max_ms']}ms")
    print(f"\nStatus Code Distribution:")
    for code, count in sorted(summary['status_codes'].items()):
        percentage = (count / summary['total_requests']) * 100
        print(f"  {code}: {count} ({percentage:.1f}%)")
    
    if summary['top_errors']:
        print(f"\nTop Errors:")
        for error in summary['top_errors'][:5]:
            print(f"  - {error}")
    
    print(f"{'='*80}\n")


def save_results(results: TestResults, filename: str = "stress_test_results.json"):
    """Save results to JSON file"""
    summary = results.get_summary()
    
    output = {
        "test_timestamp": datetime.now().isoformat(),
        "summary": summary,
        "all_latencies": results.latencies
    }
    
    with open(filename, 'w') as f:
        json.dump(output, f, indent=2)
    
    print(f"Results saved to: {filename}")


def main():
    """Main entry point"""
    import argparse
    
    parser = argparse.ArgumentParser(description='EthixAI Stress Testing Tool')
    parser.add_argument('--url', default='http://localhost:5000', help='Target URL')
    parser.add_argument('--users', type=int, default=10, help='Concurrent users')
    parser.add_argument('--requests', type=int, default=100, help='Requests per user')
    parser.add_argument('--payload-size', type=int, default=100, help='Records per request')
    parser.add_argument('--timeout', type=int, default=30, help='Request timeout (seconds)')
    parser.add_argument('--output', default='stress_test_results.json', help='Output filename')
    
    args = parser.parse_args()
    
    config = TestConfig(
        target_url=args.url,
        concurrent_users=args.users,
        requests_per_user=args.requests,
        payload_size=args.payload_size,
        timeout_seconds=args.timeout
    )
    
    # Run the test
    results = asyncio.run(run_stress_test(config))
    
    # Print and save results
    print_results(results)
    save_results(results, args.output)
    
    # Exit with error code if success rate < 95%
    summary = results.get_summary()
    if summary['success_rate'] < 95:
        print("⚠️  WARNING: Success rate below 95%")
        sys.exit(1)
    else:
        print("✅ Test completed successfully!")
        sys.exit(0)


if __name__ == '__main__':
    main()
