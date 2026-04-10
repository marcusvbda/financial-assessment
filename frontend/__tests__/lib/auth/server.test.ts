import * as nextHeaders from 'next/headers';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  backendRequest,
  getCurrentUser,
  getCurrentUserFromToken,
  protectedBackendRequest,
} from '@/lib/auth/server';

const mockUser = { id: 1, name: 'Test User', email: 'test@test.com', role: 'client' };

function mockCookieStore(token?: string) {
  return {
    get: vi.fn().mockReturnValue(token ? { value: token } : undefined),
    set: vi.fn(),
    delete: vi.fn(),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.BACKEND_URL = 'http://backend:3001';
});

describe('backendRequest', () => {
  it('sets Content-Type: application/json when body is present and header is absent', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetchMock);

    await backendRequest('/api/test', { method: 'POST', body: '{"foo":1}' });

    const headers: Headers = fetchMock.mock.calls[0][1].headers;
    expect(headers.get('content-type')).toBe('application/json');
  });

  it('does not override an explicitly provided Content-Type', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetchMock);

    await backendRequest('/api/test', {
      method: 'POST',
      body: 'raw',
      headers: { 'Content-Type': 'text/plain' },
    });

    const headers: Headers = fetchMock.mock.calls[0][1].headers;
    expect(headers.get('content-type')).toBe('text/plain');
  });

  it('always sets cache: no-store', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetchMock);

    await backendRequest('/api/test');

    expect(fetchMock.mock.calls[0][1].cache).toBe('no-store');
  });

  it('builds the full URL from BACKEND_URL + path', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetchMock);

    await backendRequest('/api/users/me');

    expect(fetchMock.mock.calls[0][0]).toBe('http://backend:3001/api/users/me');
  });
});

describe('getCurrentUserFromToken', () => {
  it('returns null when token is null', async () => {
    expect(await getCurrentUserFromToken(null)).toBeNull();
  });

  it('returns null when token is undefined', async () => {
    expect(await getCurrentUserFromToken(undefined)).toBeNull();
  });

  it('returns user data when /me responds successfully', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: async () => mockUser })
    );

    expect(await getCurrentUserFromToken('valid.token')).toEqual(mockUser);
  });

  it('returns null when /me returns a non-ok status (expired token)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 401 })
    );

    expect(await getCurrentUserFromToken('expired.token')).toBeNull();
  });

  it('returns null on network error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));

    expect(await getCurrentUserFromToken('some.token')).toBeNull();
  });
});

describe('getCurrentUser', () => {
  it('returns null when no session cookie is present', async () => {
    vi.mocked(nextHeaders.cookies).mockResolvedValue(mockCookieStore() as never);
    vi.stubGlobal('fetch', vi.fn());

    expect(await getCurrentUser()).toBeNull();
  });

  it('returns the authenticated user when cookie holds a valid token', async () => {
    vi.mocked(nextHeaders.cookies).mockResolvedValue(mockCookieStore('valid.token') as never);
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: async () => mockUser })
    );

    expect(await getCurrentUser()).toEqual(mockUser);
  });
});

describe('protectedBackendRequest', () => {
  it('calls redirect("/") when no session cookie is present', async () => {
    vi.mocked(nextHeaders.cookies).mockResolvedValue(mockCookieStore() as never);

    await expect(protectedBackendRequest('/api/transactions')).rejects.toThrow(
      'NEXT_REDIRECT:/'
    );
  });

  it('injects Authorization header from session cookie token', async () => {
    vi.mocked(nextHeaders.cookies).mockResolvedValue(mockCookieStore('user.jwt.here') as never);
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetchMock);

    await protectedBackendRequest('/api/transactions');

    const headers: Headers = fetchMock.mock.calls[0][1].headers;
    expect(headers.get('authorization')).toBe('Bearer user.jwt.here');
  });
});
