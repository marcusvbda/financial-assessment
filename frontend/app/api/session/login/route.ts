import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import { AUTH_COOKIE, SESSION_MAX_AGE } from '@/lib/auth/constants';

export async function POST(request: Request) {
  try {
    const body = await request.text();
    const response = await fetch(`${process.env.BACKEND_URL!}/api/auth/login`, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
      },
      body,
      cache: 'no-store',
    });

    const data = (await response.json().catch(() => ({}))) as {
      error?: string;
      token?: string;
    };

    if (!response.ok || !data.token) {
      return NextResponse.json(
        { error: data.error ?? 'Authentication failed' },
        { status: response.status || 500 }
      );
    }

    const cookieStore = await cookies();
    cookieStore.set(AUTH_COOKIE, data.token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: SESSION_MAX_AGE,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || 'Session login failed' },
      { status: 500 }
    );
  }
}
