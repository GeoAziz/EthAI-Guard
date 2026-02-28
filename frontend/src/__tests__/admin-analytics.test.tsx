import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { vi, test, expect, beforeEach } from 'vitest';

import AdminAnalyticsPage from '@/app/dashboard/admin/analytics/page';

vi.mock('@/components/auth/RoleProtected', () => ({ default: ({ children }: any) => React.createElement(React.Fragment, null, children) }));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
// DynamicChart is loaded via next/dynamic – stub it out for tests
vi.mock('next/dynamic', () => ({
  default: () => () => React.createElement('div', { 'data-testid': 'dynamic-chart' }),
}));

const mockGet = vi.fn();
vi.mock('@/lib/api');

beforeEach(async () => {
  mockGet.mockReset();
  const apiMod = await import('@/lib/api');
  apiMod.default.get = mockGet;
});

test('shows summary metrics from API response', async () => {
  mockGet.mockResolvedValue({
    data: {
      summary: { dau: 55, mau: 400, totalAnalyses: 2000, errorRate: 1.2, avgPageLoadMs: 980, npsScore: 70 },
      funnel: [
        { step: 'Login', count: 400 },
        { step: 'Analysis completed', count: 200 },
      ],
      featureAdoption: [{ feature: 'FairLens', adoptionPct: 80 }],
      engagementTimeline: [{ date: 'Jan 1', dau: 55 }],
    },
  });

  render(<AdminAnalyticsPage /> as any);

  await waitFor(() => expect(screen.getByText('55')).toBeInTheDocument());
  await waitFor(() => expect(screen.getByText('400')).toBeInTheDocument());
  expect(screen.getByText('Analytics Dashboard')).toBeInTheDocument();
});

test('falls back to mock data when API fails', async () => {
  mockGet.mockRejectedValue(new Error('Network error'));

  render(<AdminAnalyticsPage /> as any);

  // Should still render the page with mock DAU value (47)
  await waitFor(() => expect(screen.getByText('47')).toBeInTheDocument());
});
