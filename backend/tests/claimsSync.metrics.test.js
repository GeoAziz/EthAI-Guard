const metrics = require('../src/utils/metrics');

describe('claims-sync counters (unit)', () => {
  beforeEach(() => {
    jest.resetModules();
    // get fresh metrics module and reset values between tests
    jest.clearAllMocks();
    metrics.resetMetrics();
  });

  test('claimsSyncSuccessTotal increments when called', async () => {
    metrics.claimsSyncSuccessTotal.inc();
    const list = await metrics.register.getMetricsAsJSON();
    const successMetric = list.find(m => m.name === 'ethixai_backend_claims_sync_success_total');
    expect(successMetric).toBeDefined();
    const total = (successMetric.values || []).reduce((acc, v) => acc + (v.value || 0), 0);
    expect(total).toBe(1);
  });

  test('claimsSyncFailureTotal increments with labels', async () => {
    metrics.claimsSyncFailureTotal.inc({ reason: 'user_not_found_in_firebase' });
    const list = await metrics.register.getMetricsAsJSON();
    const failMetric = list.find(m => m.name === 'ethixai_backend_claims_sync_failure_total');
    expect(failMetric).toBeDefined();
    const labeled = (failMetric.values || []).find(v => v.labels && v.labels.reason === 'user_not_found_in_firebase');
    expect(labeled).toBeDefined();
    expect(labeled.value).toBe(1);
  });
});
