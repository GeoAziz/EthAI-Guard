import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import UploadDatasetModal from '@/components/datasets/UploadDatasetModal';

vi.mock('@/lib/api', () => ({
  default: {
    post: vi.fn()
  }
}));

import api from '@/lib/api';

// Fake FileReader that immediately calls onload with a data URL
class FakeReader {
  result: string | null = null;
  onload: ((ev?: any) => void) | null = null;
  onerror: ((ev?: any) => void) | null = null;
  readAsDataURL(file: File) {
    // small CSV content
    const data = 'a,b\n1,2';
    this.result = `data:text/csv;base64,${btoa(data)}`;
    if (this.onload) this.onload();
  }
}

// @ts-ignore
global.FileReader = FakeReader;

test('uploads file and shows preview', async () => {
  const postMock = (api.post as any) as any;
  // presign resolve
  postMock.mockResolvedValueOnce({});
  // ingest response with preview
  postMock.mockResolvedValueOnce({ data: { header: ['a','b'], rows_preview: [['1','2']] } });

  const onIngested = vi.fn();
  const onClose = vi.fn();

  render(<UploadDatasetModal datasetId="ds-1" onIngested={onIngested} onClose={onClose} />);

  const fileInput = screen.getByTestId('file-input') as HTMLInputElement;
  const file = new File(['a,b\n1,2'], 'test.csv', { type: 'text/csv' });
  // Trigger change
  fireEvent.change(fileInput, { target: { files: [file] } });

  const uploadBtn = screen.getByText('Upload');
  fireEvent.click(uploadBtn);

  await waitFor(() => {
    expect(onIngested).toHaveBeenCalledWith({ header: ['a','b'], rows: [['1','2']] });
  });
});
