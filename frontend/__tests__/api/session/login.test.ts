import * as nextHeaders from 'next/headers';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { POST } from '@/app/api/session/login/route';

const mockCookieSet = vi.fn();
const mockCookieStore = { set: mockCookieSet, get: vi.fn(), delete: vi.fn() };

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(nextHeaders.cookies).mockResolvedValue(mockCookieStore as never);
  process.env.BACKEND_URL = 'http://backend:3001';
});

function makeRequest(body: object): Request {
  return new Request('http://localhost:3000/api/session/login', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  });
}

describe('POST /api/session/login', () => {
  it('sets httpOnly cookie and returns success on valid credentials', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ token: 'jwt.token.here' }),
      })
    );

    const res = await POST(makeRequest({ email: 'user@test.com', password: 'password' }));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toEqual({ success: true });
    expect(mockCookieSet).toHaveBeenCalledWith(
      'session-token',
      'jwt.token.here',
      expect.objectContaining({ httpOnly: true, sameSite: 'lax' })
    );
  });

  it('returns 401 and does not set cookie when backend rejects credentials', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ error: 'Invalid credentials' }),
      })
    );

    const res = await POST(makeRequest({ email: 'x@x.com', password: 'wrong' }));
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toBe('Invalid credentials');
    expect(mockCookieSet).not.toHaveBeenCalled();
  });

  it('returns error and does not set cookie when backend omits token field', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }), // no token
      })
    );

    const res = await POST(makeRequest({ email: 'x@x.com', password: 'pw' }));

    expect(res.status).not.toBe(200);
    expect(mockCookieSet).not.toHaveBeenCalled();
  });

  it('returns 500 on network failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));

    const res = await POST(makeRequest({ email: 'x@x.com', password: 'pw' }));
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toBe('Network error');
  });
});
