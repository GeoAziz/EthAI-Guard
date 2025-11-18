#!/usr/bin/env python3
"""
Collect Prometheus metrics before, during, and after stress tests
Exports metrics to JSON/CSV for analysis
"""

import requests
import json
import csv
import time
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
import sys
import re

class MetricsCollector:
    """Collect and export Prometheus metrics"""
    
    def __init__(self, prometheus_url: str = "http://localhost:9090"):
        self.prometheus_url = prometheus_url
        self.metrics_cache = {}
    
    def query(self, query: str, time_param: Optional[str] = None) -> Dict[str, Any]:
        """Execute PromQL query"""
        url = f"{self.prometheus_url}/api/v1/query"
        params = {"query": query}
        
        if time_param:
            params["time"] = time_param
        
        try:
            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()
            return response.json()
        except requests.RequestException as e:
            print(f"❌ Error querying Prometheus: {e}")
            return {"status": "error", "data": {}}
    
    def query_range(self, query: str, start: str, end: str, step: str = "60s") -> Dict[str, Any]:
        """Execute PromQL range query"""
        url = f"{self.prometheus_url}/api/v1/query_range"
        params = {
            "query": query,
            "start": start,
            "end": end,
            "step": step
        }
        
        try:
            response = requests.get(url, params=params, timeout=30)
            response.raise_for_status()
            return response.json()
        except requests.RequestException as e:
            print(f"❌ Error querying Prometheus range: {e}")
            return {"status": "error", "data": {}}
    
    def collect_instant_metrics(self) -> Dict[str, Any]:
        """Collect current instant metrics"""
        queries = {
            "http_requests_total": 'sum(rate(http_requests_total[5m]))',
            "http_request_duration_p50": 'histogram_quantile(0.50, rate(http_request_duration_seconds_bucket[5m]))',
            "http_request_duration_p95": 'histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))',
            "http_request_duration_p99": 'histogram_quantile(0.99, rate(http_request_duration_seconds_bucket[5m]))',
            "error_rate": 'sum(rate(http_requests_total{status=~"5.."}[5m])) / sum(rate(http_requests_total[5m]))',
            "cpu_usage_backend": 'rate(process_cpu_seconds_total{job="backend"}[5m])',
            "memory_usage_backend": 'process_resident_memory_bytes{job="backend"}',
            "cpu_usage_aicore": 'rate(process_cpu_seconds_total{job="ai_core"}[5m])',
            "memory_usage_aicore": 'process_resident_memory_bytes{job="ai_core"}',
        }
        
        metrics = {
            "timestamp": datetime.now().isoformat(),
            "queries": {}
        }
        
        for name, query in queries.items():
            result = self.query(query)
            
            if result.get("status") == "success" and result.get("data", {}).get("result"):
                value = result["data"]["result"][0]["value"][1]
                metrics["queries"][name] = float(value)
            else:
                metrics["queries"][name] = None
        
        return metrics
    
    def collect_range_metrics(self, start_time: datetime, end_time: datetime) -> Dict[str, Any]:
        """Collect metrics over a time range"""
        start = start_time.isoformat() + "Z"
        end = end_time.isoformat() + "Z"
        
        queries = {
            "request_rate": 'sum(rate(http_requests_total[1m]))',
            "latency_p95": 'histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[1m]))',
            "error_rate": 'sum(rate(http_requests_total{status=~"5.."}[1m])) / sum(rate(http_requests_total[1m]))',
        }
        
        range_metrics = {
            "start_time": start,
            "end_time": end,
            "queries": {}
        }
        
        for name, query in queries.items():
            result = self.query_range(query, start, end, step="60s")
            
            if result.get("status") == "success" and result.get("data", {}).get("result"):
                range_metrics["queries"][name] = result["data"]["result"]
            else:
                range_metrics["queries"][name] = []
        
        return range_metrics

    def scrape_plain_metrics(self, urls: Dict[str, str], timeout: int = 10) -> Dict[str, Any]:
        """Scrape raw /metrics exposition from services without Prometheus server.

        Args:
            urls: Mapping of service name -> metrics URL
            timeout: HTTP timeout in seconds

        Returns:
            Dict with raw text per service and a lightweight summary.
        """
        scraped: Dict[str, Any] = { 'timestamp': datetime.now().isoformat(), 'raw': {}, 'summary': {} }

        # Simple regexes to pull out a few useful metrics
        re_http_requests = re.compile(r"^http_requests_total\{[^}]*\}\s+([0-9.eE+-]+)$")
        re_proc_mem = re.compile(r"^process_resident_memory_bytes(?:\{[^}]*\})?\s+([0-9.eE+-]+)$")

        for name, url in urls.items():
            try:
                resp = requests.get(url, timeout=timeout, allow_redirects=True)
                resp.raise_for_status()
                text = resp.text
                scraped['raw'][name] = text

                total_requests = 0.0
                mem_bytes: Optional[float] = None

                for line in text.splitlines():
                    m1 = re_http_requests.match(line)
                    if m1:
                        try:
                            total_requests += float(m1.group(1))
                        except Exception:
                            pass
                    m2 = re_proc_mem.match(line)
                    if m2 and mem_bytes is None:
                        try:
                            mem_bytes = float(m2.group(1))
                        except Exception:
                            pass

                scraped['summary'][name] = {
                    'http_requests_total_sum': total_requests,
                    'process_resident_memory_bytes': mem_bytes,
                }
            except requests.RequestException as e:
                scraped['raw'][name] = None
                scraped['summary'][name] = {'error': str(e)}

        return scraped
    
    def export_to_json(self, metrics: Dict[str, Any], filename: str):
        """Export metrics to JSON"""
        with open(filename, 'w') as f:
            json.dump(metrics, f, indent=2)
        print(f"✅ Metrics exported to {filename}")
    
    def export_to_csv(self, range_metrics: Dict[str, Any], filename: str):
        """Export range metrics to CSV"""
        with open(filename, 'w', newline='') as f:
            writer = csv.writer(f)
            writer.writerow(["timestamp", "metric", "value"])
            
            for metric_name, results in range_metrics["queries"].items():
                for result in results:
                    for value_pair in result.get("values", []):
                        timestamp = datetime.fromtimestamp(value_pair[0]).isoformat()
                        value = value_pair[1]
                        writer.writerow([timestamp, metric_name, value])
        
        print(f"✅ Metrics exported to {filename}")


def main():
    """Main entry point"""
    import argparse
    
    parser = argparse.ArgumentParser(description='Collect Prometheus metrics for stress testing')
    parser.add_argument('--prometheus-url', default='http://localhost:9090', help='Prometheus URL')
    parser.add_argument('--mode', choices=['instant', 'range', 'scrape'], default='instant', help='Collection mode')
    parser.add_argument('--start', help='Start time (ISO format, for range mode)')
    parser.add_argument('--end', help='End time (ISO format, for range mode)')
    parser.add_argument('--output', required=True, help='Output filename (JSON or CSV)')
    parser.add_argument('--backend-metrics-url', default='http://localhost:5000/metrics', help='Direct metrics URL for backend when using scrape mode')
    parser.add_argument('--aicore-metrics-url', default='http://localhost:8100/metrics/', help='Direct metrics URL for ai_core when using scrape mode')
    
    args = parser.parse_args()
    
    collector = MetricsCollector(args.prometheus_url)
    
    if args.mode == 'instant':
        print("📊 Collecting instant metrics...")
        metrics = collector.collect_instant_metrics()
        collector.export_to_json(metrics, args.output)
        
        # Print summary
        print("\n📈 Current Metrics:")
        for key, value in metrics["queries"].items():
            if value is not None:
                print(f"  {key}: {value}")
    
    elif args.mode == 'range':
        if not args.start or not args.end:
            print("❌ Error: --start and --end required for range mode")
            sys.exit(1)
        
        start_time = datetime.fromisoformat(args.start)
        end_time = datetime.fromisoformat(args.end)
        
        print(f"📊 Collecting range metrics from {start_time} to {end_time}...")
        metrics = collector.collect_range_metrics(start_time, end_time)
        
        if args.output.endswith('.csv'):
            collector.export_to_csv(metrics, args.output)
        else:
            collector.export_to_json(metrics, args.output)

    elif args.mode == 'scrape':
        urls = {
            'backend': args.backend_metrics_url,
            'ai_core': args.aicore_metrics_url,
        }
        print(f"🧪 Scraping direct /metrics endpoints: {urls}")
        metrics = collector.scrape_plain_metrics(urls)
        collector.export_to_json(metrics, args.output)
        
        # Print small summary
        print("\n📈 Scrape Summary:")
        for svc, summary in metrics.get('summary', {}).items():
            if 'error' in summary:
                print(f"  {svc}: ERROR {summary['error']}")
            else:
                mem = summary.get('process_resident_memory_bytes')
                mem_mb = f"{mem/1024/1024:.2f} MiB" if isinstance(mem, (int, float)) else 'N/A'
                print(f"  {svc}: http_requests_total_sum={summary.get('http_requests_total_sum', 0):.0f}, rss={mem_mb}")


if __name__ == '__main__':
    main()
