import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { vi, test, expect, beforeEach } from 'vitest';

import AdminSettingsPage from '@/app/dashboard/admin/settings/page';

// Simplify rendering by mocking the auth guard and layout shell
vi.mock('@/components/auth/RoleProtected', () => ({ default: ({ children }: any) => React.createElement(React.Fragment, null, children) }));

// Mock toast hook
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));

// Mock api module; we'll attach spies in beforeEach
const mockGet = vi.fn();
const mockPut = vi.fn();
vi.mock('@/lib/api');

beforeEach(async () => {
  mockGet.mockReset();
  mockPut.mockReset();
  const apiMod = await import('@/lib/api');
  apiMod.default.get = mockGet;
  apiMod.default.put = mockPut;
});

test('loads settings and saves updated timeout', async () => {
  mockGet.mockResolvedValueOnce({ data: { default_timeout_minutes: 60 } });
  mockPut.mockResolvedValueOnce({});

  render(<AdminSettingsPage /> as any);

  // initial value from API
  const input = await screen.findByLabelText('Default analysis timeout (minutes)');
  expect((input as HTMLInputElement).value).toBe('60');

  // update value
  fireEvent.change(input, { target: { value: '45' } });

  const saveBtn = screen.getByRole('button', { name: /Save/i });
  fireEvent.click(saveBtn);

  await waitFor(() => {
    expect(mockPut).toHaveBeenCalled();
    const [path, body] = mockPut.mock.calls[0];
    expect(path).toBe('/v1/org/settings');
    expect(body).toEqual(expect.objectContaining({ default_timeout_minutes: 45 }));
  });
});
