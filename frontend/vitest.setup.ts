import { vi } from 'vitest';

// Prevents 'server-only' from throwing outside the Next.js runtime
vi.mock('server-only', () => ({}));

// next/headers (cookies, headers) requires the Next.js runtime — mock it globally
vi.mock('next/headers', () => ({
  cookies: vi.fn(),
}));

// next/navigation redirect throws a special object in production;
// mirror that behavior so tests can assert the redirect target
vi.mock('next/navigation', () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
}));
