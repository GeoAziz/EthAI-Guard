import React from 'react';
// enable test bypass for RoleProtected
process.env.NEXT_PUBLIC_TEST_BYPASS_AUTH = '1';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, test, expect, beforeEach } from 'vitest';

// Mock api module pattern used elsewhere (assign spies in beforeEach to avoid hoisting issues)
vi.mock('@/lib/api');
import api from '@/lib/api';

import DatasetsPage from '@/app/datasets/page';

beforeEach(async () => {
  const apiMod = await import('@/lib/api');
  (apiMod.default.get as any) = vi.fn();
});

test('renders dataset rows and opens Create and Upload modals', async () => {
  (api.get as any).mockResolvedValueOnce({ data: { datasets: [{ datasetId: 'ds-1', name: 'Customer Dataset', latest_version: 'v1', uploadedBy: 'alice', size_bytes: 12345, sensitivity: 'low' }] } });

  render(<DatasetsPage /> as any);

  // wait for dataset row
  await waitFor(() => expect(screen.getByText('Customer Dataset')).toBeInTheDocument());

  // uploadedBy and sensitivity should be visible
  expect(screen.getByText('alice')).toBeInTheDocument();
  expect(screen.getByText('low')).toBeInTheDocument();

  // open Create modal
  const createBtn = screen.getByText('Create dataset');
  fireEvent.click(createBtn);
  await waitFor(() => expect(screen.getByRole('heading', { name: /Create dataset/i })).toBeInTheDocument());

  // close create modal by clicking Cancel (button text 'Cancel' exists in modal)
  const cancelBtn = screen.getAllByText('Cancel')[0];
  fireEvent.click(cancelBtn);

  // open Upload modal via per-row action (admin uses 'Upload file' text)
  const uploadBtn = screen.getByText('Upload file');
  fireEvent.click(uploadBtn);
  await waitFor(() => expect(screen.getByRole('heading', { name: /Upload dataset file/i })).toBeInTheDocument());
});
