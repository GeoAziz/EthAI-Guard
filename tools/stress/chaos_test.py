#!/usr/bin/env python3
"""
Chaos Engineering Test for EthixAI
Simulates various failure scenarios to test system resilience
"""

import asyncio
import aiohttp
import random
import time
import json
from typing import Dict, Any, List
from dataclasses import dataclass, field

@dataclass
class ChaosConfig:
    """Chaos testing configuration"""
    target_url: str = "http://localhost:5000"
    duration_seconds: int = 600  # 10 minutes
    concurrent_users: int = 20
    
    # Failure injection rates (0.0 - 1.0)
    timeout_rate: float = 0.10  # 10% of requests timeout
    network_error_rate: float = 0.05  # 5% network errors
    slow_response_rate: float = 0.15  # 15% intentionally slow responses
    
    # Failure simulation parameters
    timeout_after_seconds: int = 1  # Timeout after 1 second
    slow_response_delay: int = 5  # Add 5 second delay

@dataclass
class ChaosResults:
    """Results from chaos testing"""
    total_requests: int = 0
    successful_requests: int = 0
    timeout_requests: int = 0
    network_errors: int = 0
    slow_responses: int = 0
    server_errors: int = 0
    
    latencies: List[float] = field(default_factory=list)
    request_ids: List[str] = field(default_factory=list)
    
    def add_result(self, success: bool, latency: float, error_type: str = "", request_id: str = ""):
        """Record a test result"""
        self.total_requests += 1
        self.latencies.append(latency)
        
        if request_id:
            self.request_ids.append(request_id)
        
        if success:
            self.successful_requests += 1
        elif error_type == "timeout":
            self.timeout_requests += 1
        elif error_type == "network":
            self.network_errors += 1
        elif error_type == "slow":
            self.slow_responses += 1
        elif error_type == "server":
            self.server_errors += 1
    
    def get_summary(self) -> Dict[str, Any]:
        """Get summary statistics"""
        return {
            "total_requests": self.total_requests,
            "successful_requests": self.successful_requests,
            "timeout_requests": self.timeout_requests,
            "network_errors": self.network_errors,
            "slow_responses": self.slow_responses,
            "server_errors": self.server_errors,
            "success_rate": round(self.successful_requests / self.total_requests * 100, 2) if self.total_requests > 0 else 0,
            "avg_latency_ms": round(sum(self.latencies) / len(self.latencies), 2) if self.latencies else 0,
            "unique_request_ids": len(set(self.request_ids))
        }


def generate_payload(size: int = 100) -> List[Dict[str, Any]]:
    """Generate test payload"""
    data = []
    for i in range(size):
        data.append({
            'id': f'chaos_{i}',
            'credit_score': random.randint(500, 900),
            'income': random.randint(30000, 130000),
            'debt_to_income_ratio': round(random.random() * 0.6, 3),
            'employment_years': random.randint(0, 30),
            'existing_credit_lines': random.randint(0, 10),
            'age': random.choice(['18-25', '26-35', '36-45', '46-55', '56+']),
            'gender': random.choice(['male', 'female']),
            'ethnicity': random.choice(['group_a', 'group_b', 'group_c', 'group_d']),
            'approved': random.random() > 0.3
        })
    return data


async def make_chaotic_request(session: aiohttp.ClientSession, config: ChaosConfig) -> Dict[str, Any]:
    """Make a request with chaos injection"""
    request_id = f"chaos-{random.randint(100000, 999999)}"
    payload = generate_payload(100)
    
    # Decide if this request should have a failure injected
    failure_type = None
    
    if random.random() < config.timeout_rate:
        failure_type = "timeout"
        timeout = config.timeout_after_seconds
    elif random.random() < config.network_error_rate:
        failure_type = "network"
        # Simulate network error by using invalid URL
        return {
            "success": False,
            "latency": 0,
            "error_type": "network",
            "request_id": request_id
        }
    else:
        timeout = 30  # Normal timeout
    
    start_time = time.time()
    
    try:
        async with session.post(
            f"{config.target_url}/api/analyze",
            json={
                "model_type": "credit_scoring",
                "dataset": payload,
                "protected_attributes": ["gender"],
                "target_column": "approved"
            },
            headers={
                "Content-Type": "application/json",
                "X-Request-Id": request_id
            },
            timeout=aiohttp.ClientTimeout(total=timeout)
        ) as response:
            latency = (time.time() - start_time) * 1000
            
            # Simulate slow response (add artificial delay)
            if random.random() < config.slow_response_rate:
                await asyncio.sleep(config.slow_response_delay)
                latency += config.slow_response_delay * 1000
                failure_type = "slow"
            
            return {
                "success": 200 <= response.status < 300,
                "latency": latency,
                "error_type": "server" if response.status >= 500 else failure_type,
                "request_id": request_id,
                "status_code": response.status
            }
    
    except asyncio.TimeoutError:
        latency = (time.time() - start_time) * 1000
        return {
            "success": False,
            "latency": latency,
            "error_type": "timeout",
            "request_id": request_id
        }
    
    except Exception as e:
        latency = (time.time() - start_time) * 1000
        return {
            "success": False,
            "latency": latency,
            "error_type": "network",
            "request_id": request_id,
            "error": str(e)
        }


async def chaos_user(user_id: int, config: ChaosConfig, results: ChaosResults):
    """Simulate a user making requests with chaos injection"""
    connector = aiohttp.TCPConnector(limit=5)
    async with aiohttp.ClientSession(connector=connector) as session:
        start_time = time.time()
        request_count = 0
        
        while time.time() - start_time < config.duration_seconds:
            result = await make_chaotic_request(session, config)
            
            results.add_result(
                success=result["success"],
                latency=result["latency"],
                error_type=result.get("error_type", ""),
                request_id=result.get("request_id", "")
            )
            
            request_count += 1
            
            if request_count % 10 == 0:
                elapsed = time.time() - start_time
                print(f"[Chaos User {user_id}] {request_count} requests in {elapsed:.1f}s")
            
            await asyncio.sleep(random.uniform(0.5, 2))  # Random delay


async def run_chaos_test(config: ChaosConfig) -> ChaosResults:
    """Run chaos engineering test"""
    results = ChaosResults()
    
    print(f"\n{'='*80}")
    print(f"Starting Chaos Engineering Test")
    print(f"{'='*80}")
    print(f"Target: {config.target_url}")
    print(f"Duration: {config.duration_seconds}s")
    print(f"Concurrent Users: {config.concurrent_users}")
    print(f"\nFailure Injection Rates:")
    print(f"  Timeouts: {config.timeout_rate * 100}%")
    print(f"  Network Errors: {config.network_error_rate * 100}%")
    print(f"  Slow Responses: {config.slow_response_rate * 100}%")
    print(f"{'='*80}\n")
    
    # Run chaos users
    tasks = [
        chaos_user(user_id, config, results)
        for user_id in range(config.concurrent_users)
    ]
    
    await asyncio.gather(*tasks)
    
    return results


def print_chaos_results(results: ChaosResults):
    """Print chaos test results"""
    summary = results.get_summary()
    
    print(f"\n{'='*80}")
    print(f"Chaos Test Results")
    print(f"{'='*80}")
    print(f"Total Requests: {summary['total_requests']}")
    print(f"Successful: {summary['successful_requests']} ({summary['success_rate']}%)")
    print(f"\nFailure Breakdown:")
    print(f"  Timeouts: {summary['timeout_requests']}")
    print(f"  Network Errors: {summary['network_errors']}")
    print(f"  Slow Responses: {summary['slow_responses']}")
    print(f"  Server Errors: {summary['server_errors']}")
    print(f"\nAverage Latency: {summary['avg_latency_ms']}ms")
    print(f"Unique Request IDs Captured: {summary['unique_request_ids']}")
    print(f"{'='*80}\n")
    
    # Assess resilience
    if summary['success_rate'] > 80:
        print("✅ RESILIENCE CHECK: PASSED - System handled chaos well")
    elif summary['success_rate'] > 60:
        print("⚠️  RESILIENCE CHECK: WARNING - System struggled under chaos")
    else:
        print("❌ RESILIENCE CHECK: FAILED - System not resilient to failures")


def save_chaos_results(results: ChaosResults, filename: str = "chaos_test_results.json"):
    """Save chaos test results"""
    output = {
        "test_type": "chaos_engineering",
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
        "summary": results.get_summary(),
        "request_ids_sample": results.request_ids[:100]  # Save sample for audit verification
    }
    
    with open(filename, 'w') as f:
        json.dump(output, f, indent=2)
    
    print(f"Results saved to: {filename}")


def main():
    """Main entry point"""
    import argparse
    
    parser = argparse.ArgumentParser(description='Chaos Engineering Test for EthixAI')
    parser.add_argument('--url', default='http://localhost:5000', help='Target URL')
    parser.add_argument('--duration', type=int, default=600, help='Test duration (seconds)')
    parser.add_argument('--users', type=int, default=20, help='Concurrent users')
    parser.add_argument('--timeout-rate', type=float, default=0.10, help='Timeout injection rate')
    parser.add_argument('--network-error-rate', type=float, default=0.05, help='Network error rate')
    parser.add_argument('--slow-rate', type=float, default=0.15, help='Slow response rate')
    parser.add_argument('--output', default='chaos_test_results.json', help='Output file')
    
    args = parser.parse_args()
    
    config = ChaosConfig(
        target_url=args.url,
        duration_seconds=args.duration,
        concurrent_users=args.users,
        timeout_rate=args.timeout_rate,
        network_error_rate=args.network_error_rate,
        slow_response_rate=args.slow_rate
    )
    
    # Run chaos test
    results = asyncio.run(run_chaos_test(config))
    
    # Print and save results
    print_chaos_results(results)
    save_chaos_results(results, args.output)


if __name__ == '__main__':
    main()
