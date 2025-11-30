/// <reference types="vitest" />
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, test, expect, beforeEach, vi } from 'vitest';
import type { Mock } from 'vitest';

vi.mock('@/components/auth/RoleProtected', () => ({ default: ({ children }: any) => children }));
const mockToast = vi.fn();
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: mockToast }) }));
vi.mock('next/navigation', () => ({ usePathname: () => '/dashboard/analyst/reports/ r1' }));
vi.mock('@/components/layout/breadcrumbs', () => ({ default: () => null }));

vi.mock('@/lib/api');
import api from '@/lib/api';
import AnalystReportDetailsPage from '@/app/dashboard/analyst/reports/[id]/page';

describe('Analyst report detail', () => {
  beforeEach(() => { vi.resetAllMocks(); });

  test('fetches report details and renders bias/drift and exports', async () => {
    const report = { id: 'r1', name: 'Loan scoring explainability', modelId: 'loan-v3', metrics: { DI: 0.9 }, featureDrift: [{ feature: 'a', drift: 0.1 }, { feature: 'b', drift: 0.3 }] };
    (api.get as Mock).mockResolvedValueOnce({ data: report });

    render(<AnalystReportDetailsPage params={{ id: 'r1' }} />);

    expect(await screen.findByText('Loan scoring explainability')).toBeInTheDocument();
    // biasSeverity from DI 0.9 -> medium
    expect(screen.getByText(/medium/i)).toBeInTheDocument();
    // drift average (0.1+0.3)/2 = 0.2
    expect(screen.getByText('0.2')).toBeInTheDocument();

    // mock export
    (api.get as Mock).mockResolvedValueOnce({ data: new Blob(['ok']) });
    const exportBtn = screen.getByText('Export');
    exportBtn.click();
    await waitFor(() => expect(api.get).toHaveBeenCalledWith('/v1/reports/r1/export', { responseType: 'blob' as any }));
  });
});
