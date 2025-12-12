import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { vi, beforeEach, describe, test, expect } from 'vitest';
import type { Mock } from 'vitest';

// Mocks
vi.mock('@/components/auth/RoleProtected', () => ({ default: ({ children }: any) => children }));
const mockToast = vi.fn();
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: mockToast }) }));
vi.mock('next/navigation', () => ({ usePathname: () => '/dashboard/analyst/reports' }));
// Mock Breadcrumbs to avoid rendering environment differences in tests
vi.mock('@/components/layout/breadcrumbs', () => ({ default: () => null }));

vi.mock('@/lib/api');
import api from '@/lib/api';
import AnalystReportsPage from '@/app/dashboard/analyst/reports/page';

describe('Analyst reports list', () => {
  beforeEach(() => { vi.resetAllMocks(); });

  test('fetches and renders reports with bias severity and drift score and exports', async () => {
    const reports = [
      { id: 'r1', name: 'Loan scoring explainability', type: 'Explainability', modelId: 'loan-v3', createdAt: '2025-11-20', metrics: { DI: 0.7 }, featureDrift: [{ feature: 'f1', drift: 0.2 }] },
      { id: 'r2', name: 'Churn fairness snapshot', type: 'Fairness', modelId: 'churn-v2', createdAt: '2025-11-02', biasSeverity: 'medium' },
    ];
    const apiMod = await import('@/lib/api');
    apiMod.default.get = vi.fn().mockResolvedValueOnce({ data: reports });

    render(<AnalystReportsPage />);

    // wait for first report row
    await waitFor(() => expect(screen.getByText('Loan scoring explainability')).toBeInTheDocument());

    // computed bias severity from DI 0.7 -> 'high'
    expect(screen.getByText('high')).toBeInTheDocument();

    // computed drift score (avg 0.2)
    expect(screen.getByText('0.2')).toBeInTheDocument();
    // prepare export response for r1
    apiMod.default.get = vi.fn().mockResolvedValueOnce({ data: new Blob(['ok']) });

    const exportBtn = screen.getAllByText('Export')[0];
    fireEvent.click(exportBtn);

    await waitFor(() => expect(apiMod.default.get).toHaveBeenCalledWith('/v1/reports/r1/export', { responseType: 'blob' as any }));
  });
});
