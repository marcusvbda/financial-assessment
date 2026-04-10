import 'server-only';

import { cookies } from 'next/headers';

import { AUTH_COOKIE } from '@/lib/auth/constants';

export interface SessionUser {
  id: number;
  name: string;
  email: string;
  role: string;
}

export async function backendRequest(path: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);

  if (!headers.has('Content-Type') && init.body) {
    headers.set('Content-Type', 'application/json');
  }

  return fetch(`${process.env.BACKEND_URL!}${path}`, {
    ...init,
    headers,
    cache: 'no-store',
  });
}

export async function getCurrentUserFromToken(token?: string | null) {
  if (!token) {
    return null;
  }

  try {
    const response = await backendRequest('/api/users/me', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as SessionUser;
  } catch {
    return null;
  }
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE)?.value;

  return getCurrentUserFromToken(token);
}
