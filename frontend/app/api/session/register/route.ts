import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.text();
    const response = await fetch(`${process.env.BACKEND_URL!}/api/auth/register`, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
      },
      body,
      cache: 'no-store',
    });

    const data = await response.json().catch(() => ({}));

    return NextResponse.json(data, {
      status: response.status,
    });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || 'Session registration failed' },
      { status: 500 }
    );
  }
}
