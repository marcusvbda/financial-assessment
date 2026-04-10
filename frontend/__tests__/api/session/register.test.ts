import { beforeEach, describe, expect, it, vi } from 'vitest';

import { POST } from '@/app/api/session/register/route';

beforeEach(() => {
  vi.clearAllMocks();
  process.env.BACKEND_URL = 'http://backend:3001';
});

function makeRequest(body: object): Request {
  return new Request('http://localhost:3000/api/session/register', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  });
}

const validBody = {
  name: 'Test User',
  email: 'test@test.com',
  password: '123456',
  confirm_password: '123456',
};

describe('POST /api/session/register', () => {
  it('proxies 201 response from backend on successful registration', async () => {
    const user = { id: 1, name: 'Test User', email: 'test@test.com', role: 'client' };
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 201,
        json: async () => user,
      })
    );

    const res = await POST(makeRequest(validBody));
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data).toEqual(user);
  });

  it('proxies 409 when email is already taken', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 409,
        json: async () => ({ error: 'email already in use' }),
      })
    );

    const res = await POST(makeRequest({ ...validBody, email: 'existing@test.com' }));
    const data = await res.json();

    expect(res.status).toBe(409);
    expect(data.error).toBe('email already in use');
  });

  it('returns 500 on network failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('ECONNREFUSED')));

    const res = await POST(makeRequest(validBody));
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toBeDefined();
  });
});
