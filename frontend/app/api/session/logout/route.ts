import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { AUTH_COOKIE } from '@/lib/auth/constants';

export async function POST() {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE)?.value;

  try {
    if (token) {
      await fetch(`${process.env.BACKEND_URL!}/api/auth/revoke`, {
        method: 'POST',
        headers: {
          accept: 'application/json',
          authorization: `Bearer ${token}`,
        },
        cache: 'no-store',
      });
    }
  } finally {
    cookieStore.delete(AUTH_COOKIE);
  }

  return NextResponse.json({ success: true });
}
