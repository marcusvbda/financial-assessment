import { NextRequest } from 'next/server';
import { describe, expect, it } from 'vitest';

import { proxy } from '@/proxy';

function makeRequest(path: string, token?: string): NextRequest {
  const req = new NextRequest(`http://localhost:3000${path}`);
  if (token) {
    req.cookies.set('session-token', token);
  }
  return req;
}

describe('proxy middleware — /app routes', () => {
  it('redirects to / when unauthenticated', () => {
    const res = proxy(makeRequest('/app'));
    expect(res.headers.get('location')).toBe('http://localhost:3000/');
  });

  it('redirects nested /app/* paths to / when unauthenticated', () => {
    const res = proxy(makeRequest('/app/transactions'));
    expect(res.headers.get('location')).toBe('http://localhost:3000/');
  });

  it('passes through when session cookie is present', () => {
    const res = proxy(makeRequest('/app', 'tok_abc'));
    expect(res.headers.get('location')).toBeNull();
  });
});

describe('proxy middleware — /login route', () => {
  it('redirects to /app when already authenticated', () => {
    const res = proxy(makeRequest('/login', 'tok_abc'));
    expect(res.headers.get('location')).toBe('http://localhost:3000/app');
  });

  it('passes through when unauthenticated', () => {
    const res = proxy(makeRequest('/login'));
    expect(res.headers.get('location')).toBeNull();
  });
});
