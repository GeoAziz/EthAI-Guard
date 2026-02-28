import { vi, describe, test, expect, beforeEach, afterEach } from 'vitest';

// ---- analytics.ts tests -------------------------------------------------

// We mock the api module so no HTTP calls are made
vi.mock('@/lib/api', () => ({
  default: {
    post: vi.fn().mockResolvedValue({ data: {} }),
    get: vi.fn().mockResolvedValue({ data: {} }),
  },
}));

describe('analytics', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.resetModules();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('trackEvent enqueues an event without throwing', async () => {
    const { trackEvent } = await import('@/lib/analytics');
    expect(() => trackEvent('test_event', { foo: 'bar' })).not.toThrow();
  });

  test('trackPageView does not throw', async () => {
    const { trackPageView } = await import('@/lib/analytics');
    expect(() => trackPageView('/dashboard')).not.toThrow();
  });

  test('trackFunnelStep does not throw', async () => {
    const { trackFunnelStep } = await import('@/lib/analytics');
    expect(() => trackFunnelStep('login_funnel', 'login', { method: 'email' }, 'user-1')).not.toThrow();
  });
});

// ---- feature-flags.ts tests ---------------------------------------------

describe('feature-flags', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  test('isEnabled returns default value for known flag', async () => {
    const { isEnabled } = await import('@/lib/feature-flags');
    // analytics_dashboard defaults to true
    expect(isEnabled('analytics_dashboard')).toBe(true);
    // new_dashboard_layout defaults to false
    expect(isEnabled('new_dashboard_layout')).toBe(false);
  });

  test('isEnabled returns false for unknown flag', async () => {
    const { isEnabled } = await import('@/lib/feature-flags');
    expect(isEnabled('nonexistent_flag_xyz')).toBe(false);
  });

  test('getVariant returns control for boolean flag', async () => {
    const { getVariant } = await import('@/lib/feature-flags');
    expect(getVariant('analytics_dashboard')).toBe('control');
  });

  test('getVariant returns string value for ab test flag', async () => {
    const { getVariant } = await import('@/lib/feature-flags');
    expect(getVariant('ab_pricing_page')).toBe('control');
  });
});

// ---- performance.ts tests -----------------------------------------------

describe('performance', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  test('trackCustomMetric emits a web_vital event', async () => {
    const analyticsMod = await import('@/lib/analytics');
    const spy = vi.spyOn(analyticsMod, 'trackEvent');

    const { trackCustomMetric } = await import('@/lib/performance');
    trackCustomMetric('time_to_result', 850);

    expect(spy).toHaveBeenCalledWith(
      'web_vital',
      expect.objectContaining({ name: 'time_to_result', value: 850 }),
    );
    spy.mockRestore();
  });

  test('initPerformanceMonitoring does not throw in jsdom', async () => {
    const { initPerformanceMonitoring } = await import('@/lib/performance');
    expect(() => initPerformanceMonitoring()).not.toThrow();
  });
});
