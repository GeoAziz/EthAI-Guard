/**
 * Performance monitoring – collects Core Web Vitals and custom metrics
 * using the native PerformanceObserver API and forwards them via the
 * analytics event pipeline.
 *
 * Call `initPerformanceMonitoring()` once at app bootstrap (e.g. in
 * layout.tsx or _app.tsx).
 */

import { trackEvent } from './analytics';

export type MetricName = 'FCP' | 'LCP' | 'CLS' | 'TTI' | 'FID' | 'custom';

export type PerformanceMetric = {
  name: MetricName | string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  path?: string;
};

// Thresholds sourced from web.dev/vitals
const THRESHOLDS: Record<string, [number, number]> = {
  FCP: [1800, 3000],
  LCP: [2500, 4000],
  CLS: [0.1, 0.25],
  FID: [100, 300],
  TTI: [3800, 7300],
};

function rateMetric(name: string, value: number): PerformanceMetric['rating'] {
  const t = THRESHOLDS[name];
  if (!t) { return 'good'; }
  if (value <= t[0]) { return 'good'; }
  if (value <= t[1]) { return 'needs-improvement'; }
  return 'poor';
}

const CLS_SCALE = 1000; // CLS is a unitless ratio (0–1); multiply by 1000 for milliCLS so Math.round keeps 3 significant figures

function report(name: string, value: number) {
  const metric: PerformanceMetric = {
    name,
    // CLS values are tiny decimals (e.g. 0.12). Scale by 1000 so the stored integer (120) is human-readable.
    value: Math.round(name === 'CLS' ? value * CLS_SCALE : value),
    rating: rateMetric(name, value),
    path: typeof window !== 'undefined' ? window.location.pathname : undefined,
  };
  trackEvent('web_vital', { ...metric });
  return metric;
}

let _initialized = false;

/**
 * Start observing Core Web Vitals via PerformanceObserver.
 * Safe to call in a browser-only context (SSR-safe guard is included).
 */
export function initPerformanceMonitoring() {
  if (typeof window === 'undefined' || _initialized) { return; }
  _initialized = true;

  // First Contentful Paint
  try {
    const paintObs = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.name === 'first-contentful-paint') {
          report('FCP', entry.startTime);
        }
      }
    });
    paintObs.observe({ type: 'paint', buffered: true });
  } catch { /* unsupported */ }

  // Largest Contentful Paint
  try {
    const lcpObs = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const last = entries[entries.length - 1] as any;
      if (last) { report('LCP', last.startTime); }
    });
    lcpObs.observe({ type: 'largest-contentful-paint', buffered: true });
  } catch { /* unsupported */ }

  // Cumulative Layout Shift
  try {
    let clsValue = 0;
    const clsObs = new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as any[]) {
        if (!entry.hadRecentInput) { clsValue += entry.value; }
      }
    });
    clsObs.observe({ type: 'layout-shift', buffered: true });
    window.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') { report('CLS', clsValue); }
    });
  } catch { /* unsupported */ }

  // First Input Delay (via event timing)
  try {
    const fidObs = new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as any[]) {
        report('FID', entry.processingStart - entry.startTime);
      }
    });
    fidObs.observe({ type: 'first-input', buffered: true });
  } catch { /* unsupported */ }
}

/**
 * Track a custom performance mark (e.g. time-to-analysis-result).
 */
export function trackCustomMetric(name: string, value: number) {
  return report(name, value);
}
