'use client';

import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { z } from 'zod';

export type AuthMode = 'login' | 'register';

export type AuthFieldErrors = Partial<Record<'name' | 'email' | 'password' | 'confirmPassword', string>>;

export const loginSchema = z.object({
  email: z.string().email('Enter a valid email address.'),
  password: z.string().min(1, 'Password is required.'),
});

export const registerSchema = z
  .object({
    name: z.string().min(1, 'Full name is required.'),
    email: z.string().email('Enter a valid email address.'),
    password: z.string().min(6, 'Password must be at least 6 characters.'),
    confirmPassword: z.string().min(1, 'Please confirm your password.'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  });

interface UseAuthOptions {
  mode: AuthMode;
  redirectTo?: string | null;
  onSuccess?: () => void;
}

export function useAuthMutation({ mode, redirectTo = '/app', onSuccess }: UseAuthOptions) {
  const router = useRouter();

  return useMutation({
    mutationFn: async (formData: FormData) => {
      if (mode === 'login') {
        const parsed = loginSchema.safeParse({
          email: formData.get('email'),
          password: formData.get('password'),
        });

        if (!parsed.success) throw parsed.error;

        const res = await fetch('/api/session/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(parsed.data),
        });

        const data = (await res.json().catch(() => ({}))) as { error?: string };
        if (!res.ok) throw new Error(data.error ?? 'Authentication failed');
        return null;
      }

      const parsed = registerSchema.safeParse({
        name: formData.get('name'),
        email: formData.get('email'),
        password: formData.get('password'),
        confirmPassword: formData.get('confirmPassword'),
      });

      if (!parsed.success) throw parsed.error;

      const registerRes = await fetch('/api/session/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: parsed.data.name,
          email: parsed.data.email,
          password: parsed.data.password,
          confirm_password: parsed.data.confirmPassword,
        }),
      });

      const registerData = (await registerRes.json().catch(() => ({}))) as { error?: string };
      if (!registerRes.ok) throw new Error(registerData.error ?? 'Registration failed');

      const loginRes = await fetch('/api/session/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: parsed.data.email, password: parsed.data.password }),
      });

      const loginData = (await loginRes.json().catch(() => ({}))) as { error?: string };
      if (!loginRes.ok) throw new Error(loginData.error ?? 'Account created, but sign in failed');

      return null;
    },
    onSuccess: () => {
      onSuccess?.();
      if (redirectTo) router.push(redirectTo);
      router.refresh();
    },
  });
}
