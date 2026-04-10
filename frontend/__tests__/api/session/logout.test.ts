import * as nextHeaders from 'next/headers';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { POST } from '@/app/api/session/logout/route';

const mockCookieDelete = vi.fn();
const mockCookieGet = vi.fn();
const mockCookieStore = { get: mockCookieGet, set: vi.fn(), delete: mockCookieDelete };

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(nextHeaders.cookies).mockResolvedValue(mockCookieStore as never);
  process.env.BACKEND_URL = 'http://backend:3001';
});

describe('POST /api/session/logout', () => {
  it('deletes session cookie and returns success when no token is present', async () => {
    mockCookieGet.mockReturnValue(undefined);
    vi.stubGlobal('fetch', vi.fn());

    const res = await POST();
    const data = await res.json();

    expect(data).toEqual({ success: true });
    expect(mockCookieDelete).toHaveBeenCalledWith('session-token');
  });

  it('calls backend revoke with bearer token before deleting cookie', async () => {
    mockCookieGet.mockReturnValue({ value: 'valid.jwt.token' });
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetchMock);

    await POST();

    expect(fetchMock).toHaveBeenCalledWith(
      'http://backend:3001/api/auth/revoke',
      expect.objectContaining({
        headers: expect.objectContaining({ authorization: 'Bearer valid.jwt.token' }),
      })
    );
    expect(mockCookieDelete).toHaveBeenCalledWith('session-token');
  });

  it('still deletes cookie and returns success even when revoke request fails', async () => {
    mockCookieGet.mockReturnValue({ value: 'some.token' });
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));

    const res = await POST();
    const data = await res.json();

    expect(data).toEqual({ success: true });
    expect(mockCookieDelete).toHaveBeenCalledWith('session-token');
  });
});
