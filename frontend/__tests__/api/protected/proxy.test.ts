import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DELETE, GET, POST } from '@/app/api/protected/[...proxy]/route';

type ProxyContext = { params: Promise<{ proxy: string[] }> };

function ctx(segments: string[]): ProxyContext {
  return { params: Promise.resolve({ proxy: segments }) };
}

function backendResponse(status = 200) {
  return { body: null, status, headers: new Headers({ 'content-type': 'application/json' }) };
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.BACKEND_URL = 'http://backend:3001';
});

describe('GET /api/protected/[...proxy]', () => {
  it('forwards Authorization header from session cookie', async () => {
    const fetchMock = vi.fn().mockResolvedValue(backendResponse());
    vi.stubGlobal('fetch', fetchMock);

    const req = new NextRequest('http://localhost:3000/api/protected/transactions');
    req.cookies.set('session-token', 'user.jwt.token');

    await GET(req, ctx(['transactions']));

    const calledHeaders: Headers = fetchMock.mock.calls[0][1].headers;
    expect(calledHeaders.get('authorization')).toBe('Bearer user.jwt.token');
  });

  it('forwards request without Authorization when no cookie is present', async () => {
    const fetchMock = vi.fn().mockResolvedValue(backendResponse());
    vi.stubGlobal('fetch', fetchMock);

    await GET(new NextRequest('http://localhost:3000/api/protected/transactions'), ctx(['transactions']));

    const calledHeaders: Headers = fetchMock.mock.calls[0][1].headers;
    expect(calledHeaders.get('authorization')).toBeNull();
  });

  it('builds the correct backend URL from proxy path segments', async () => {
    const fetchMock = vi.fn().mockResolvedValue(backendResponse());
    vi.stubGlobal('fetch', fetchMock);

    await GET(
      new NextRequest('http://localhost:3000/api/protected/transactions/42/reverse'),
      ctx(['transactions', '42', 'reverse'])
    );

    expect(fetchMock).toHaveBeenCalledWith(
      'http://backend:3001/api/transactions/42/reverse',
      expect.anything()
    );
  });

  it('preserves query string in forwarded URL', async () => {
    const fetchMock = vi.fn().mockResolvedValue(backendResponse());
    vi.stubGlobal('fetch', fetchMock);

    await GET(
      new NextRequest('http://localhost:3000/api/protected/transactions?status=posted'),
      ctx(['transactions'])
    );

    expect(fetchMock).toHaveBeenCalledWith(
      'http://backend:3001/api/transactions?status=posted',
      expect.anything()
    );
  });

  it('returns 500 on network failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Connection refused')));

    const res = await GET(
      new NextRequest('http://localhost:3000/api/protected/transactions'),
      ctx(['transactions'])
    );

    expect(res.status).toBe(500);
  });
});

describe('POST /api/protected/[...proxy]', () => {
  it('forwards request body to backend', async () => {
    const fetchMock = vi.fn().mockResolvedValue(backendResponse(201));
    vi.stubGlobal('fetch', fetchMock);

    const body = JSON.stringify({ amount: 100 });
    const req = new NextRequest('http://localhost:3000/api/protected/transactions', {
      method: 'POST',
      body,
      headers: { 'content-type': 'application/json' },
    });

    await POST(req, ctx(['transactions']));

    expect(fetchMock.mock.calls[0][1].body).toBe(body);
  });
});

describe('DELETE /api/protected/[...proxy]', () => {
  it('forwards DELETE method to backend', async () => {
    const fetchMock = vi.fn().mockResolvedValue(backendResponse(204));
    vi.stubGlobal('fetch', fetchMock);

    const req = new NextRequest('http://localhost:3000/api/protected/users/5', {
      method: 'DELETE',
    });

    await DELETE(req, ctx(['users', '5']));

    expect(fetchMock.mock.calls[0][1].method).toBe('DELETE');
    expect(fetchMock).toHaveBeenCalledWith('http://backend:3001/api/users/5', expect.anything());
  });
});
