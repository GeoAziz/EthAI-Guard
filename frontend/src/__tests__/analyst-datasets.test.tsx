import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, beforeEach, test, expect } from 'vitest';

// Ensure RoleProtected test bypass is enabled
process.env.NEXT_PUBLIC_TEST_BYPASS_AUTH = '1';

vi.mock('@/lib/api');
import api from '@/lib/api';

import AnalystDatasetsPage from '@/app/dashboard/analyst/datasets/page';

beforeEach(() => {
  // reset mock implementations
  (api.get as any) = vi.fn();
});

test('renders dataset rows and opens create/upload modals', async () => {
  const datasets = [
    { datasetId: 'ds-1', name: 'Customer churn', latest_version: 'v1', uploadedBy: 'alice', size_bytes: 2048, sensitivity: 'low' },
    { datasetId: 'ds-2', name: 'Loan lending', latest_version: 'v2', uploadedBy: 'bob', size_bytes: 5120, sensitivity: 'high' },
  ];

  (api.get as any).mockResolvedValueOnce({ data: { datasets } });

  render(<AnalystDatasetsPage /> as any);

  // wait for dataset rows to render
  await waitFor(() => {
    expect(screen.getByText('Customer churn')).toBeTruthy();
    expect(screen.getByText('Loan lending')).toBeTruthy();
  });

  // open create modal
  const createBtn = screen.getByText('Create dataset');
  fireEvent.click(createBtn);
  // modal header should appear
  expect(await screen.findByRole('heading', { name: /Create dataset/i })).toBeTruthy();

  // open upload modal for first row
  const uploadBtn = screen.getAllByText('Upload')[0];
  fireEvent.click(uploadBtn);
  expect(await screen.findByRole('heading', { name: /Upload dataset file/i })).toBeTruthy();
});
