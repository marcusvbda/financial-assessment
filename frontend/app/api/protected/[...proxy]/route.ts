import { NextRequest, NextResponse } from 'next/server';

import { AUTH_COOKIE } from '@/lib/auth/constants';

type ProxyContext = {
  params: Promise<{
    proxy: string[];
  }>;
};

function buildApiUrl(pathname: string, search: string) {
  const baseUrl = process.env.BACKEND_URL!.replace(/\/$/, '');
  const apiPath = pathname.replace(/^\/+/, '');

  return `${baseUrl}/api/${apiPath}${search}`;
}

function getForwardHeaders(request: NextRequest, token?: string) {
  const headers = new Headers();
  const accept = request.headers.get('accept');
  if (accept) {
    headers.set('accept', accept);
  }

  const contentType = request.headers.get('content-type');
  if (contentType) {
    headers.set('content-type', contentType);
  }

  if (token) {
    headers.set('authorization', `Bearer ${token}`);
  }

  return headers;
}

async function forwardRequest(request: NextRequest, pathSegments: string[], token?: string) {
  const url = buildApiUrl(pathSegments.join('/'), request.nextUrl.search);
  const method = request.method;
  const headers = getForwardHeaders(request, token);

  const init: RequestInit = {
    method,
    headers,
    cache: 'no-store',
  };

  if (!['GET', 'HEAD'].includes(method)) {
    init.body = await request.text();
  }

  return fetch(url, init);
}

async function handler(request: NextRequest, context: ProxyContext) {
  try {
    const { proxy } = await context.params;
    const token = request.cookies.get(AUTH_COOKIE)?.value;
    const response = await forwardRequest(request, proxy, token);

    return new NextResponse(response.body, {
      status: response.status,
      headers: response.headers,
    });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || 'Proxy request failed' },
      { status: 500 }
    );
  }
}

export { handler as GET, handler as POST, handler as PUT, handler as PATCH, handler as DELETE };
