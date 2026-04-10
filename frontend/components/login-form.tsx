'use client';

import { type FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

type AuthMode = 'login' | 'register';

interface LoginFormProps {
  defaultMode?: AuthMode;
  redirectTo?: string | null;
  onSuccess?: () => void;
}

const loginSchema = z.object({
  email: z.string().email('Enter a valid email address.'),
  password: z.string().min(1, 'Password is required.'),
});

const registerSchema = z
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

type FieldErrors = Partial<Record<'name' | 'email' | 'password' | 'confirmPassword', string>>;

export function LoginForm({
  defaultMode = 'login',
  redirectTo = '/app',
  onSuccess,
}: LoginFormProps) {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>(defaultMode);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const authMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      if (mode === 'login') {
        const parsed = loginSchema.safeParse({
          email: formData.get('email'),
          password: formData.get('password'),
        });

        if (!parsed.success) {
          throw parsed.error;
        }

        const response = await fetch('/api/session/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(parsed.data),
        });

        const data = (await response.json().catch(() => ({}))) as { error?: string };

        if (!response.ok) {
          throw new Error(data.error ?? 'Authentication failed');
        }
        return null;
      }

      const parsed = registerSchema.safeParse({
        name: formData.get('name'),
        email: formData.get('email'),
        password: formData.get('password'),
        confirmPassword: formData.get('confirmPassword'),
      });

      if (!parsed.success) {
        throw parsed.error;
      }

      const registerResponse = await fetch('/api/session/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: parsed.data.name,
          email: parsed.data.email,
          password: parsed.data.password,
          confirm_password: parsed.data.confirmPassword,
        }),
      });

      const registerData = (await registerResponse.json().catch(() => ({}))) as {
        error?: string;
      };

      if (!registerResponse.ok) {
        throw new Error(registerData.error ?? 'Authentication failed');
      }

      const loginResponse = await fetch('/api/session/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: parsed.data.email,
          password: parsed.data.password,
        }),
      });

      const loginData = (await loginResponse.json().catch(() => ({}))) as { error?: string };

      if (!loginResponse.ok) {
        throw new Error(loginData.error ?? 'Account created, but sign in failed');
      }

      return null;
    },
    onSuccess: () => {
      onSuccess?.();

      if (redirectTo) {
        router.push(redirectTo);
      }

      router.refresh();
    },
  });

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFieldErrors({});
    authMutation.reset();

    try {
      await authMutation.mutateAsync(new FormData(event.currentTarget));
    } catch (error) {
      if (error instanceof z.ZodError) {
        const nextErrors: FieldErrors = {};

        for (const issue of error.issues) {
          const key = issue.path[0];
          if (typeof key === 'string' && !nextErrors[key as keyof FieldErrors]) {
            nextErrors[key as keyof FieldErrors] = issue.message;
          }
        }

        setFieldErrors(nextErrors);
      }
    }
  }

  function switchMode(nextMode: AuthMode) {
    setMode(nextMode);
    setFieldErrors({});
    authMutation.reset();
  }

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-col gap-4">
        <div className="flex rounded-lg bg-muted p-1">
          <button
            type="button"
            className={cn(
              'flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors',
              mode === 'login' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'
            )}
            onClick={() => switchMode('login')}
          >
            Log in
          </button>
          <button
            type="button"
            className={cn(
              'flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors',
              mode === 'register'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground'
            )}
            onClick={() => switchMode('register')}
          >
            Sign up
          </button>
        </div>
        <div className="flex flex-col gap-1.5">
          <CardTitle>{mode === 'login' ? 'Welcome back' : 'Create your account'}</CardTitle>
          <CardDescription>
            {mode === 'login'
              ? 'Enter your credentials to access the platform.'
              : 'Register with your details to access the platform.'}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          {mode === 'register' && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="name">Full name</Label>
              <Input id="name" name="name" placeholder="Jane Doe" required />
              {fieldErrors.name && <p className="text-sm text-destructive">{fieldErrors.name}</p>}
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" placeholder="jane@example.com" required />
            {fieldErrors.email && <p className="text-sm text-destructive">{fieldErrors.email}</p>}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="Enter your password"
              required
            />
            {fieldErrors.password && (
              <p className="text-sm text-destructive">{fieldErrors.password}</p>
            )}
          </div>

          {mode === 'register' && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="confirmPassword">Confirm password</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                placeholder="Confirm your password"
                required
              />
              {fieldErrors.confirmPassword && (
                <p className="text-sm text-destructive">{fieldErrors.confirmPassword}</p>
              )}
            </div>
          )}

          {authMutation.error && !(authMutation.error instanceof z.ZodError) && (
            <p className="text-sm text-destructive" role="alert">
              {authMutation.error.message}
            </p>
          )}

          <Button type="submit" className="w-full" disabled={authMutation.isPending}>
            {authMutation.isPending
              ? mode === 'login'
                ? 'Signing in...'
                : 'Creating account...'
              : mode === 'login'
                ? 'Log in'
                : 'Create account'}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="text-sm text-muted-foreground">
        {mode === 'login'
          ? 'Use your registered email and password.'
          : 'Your account will be created as a client user.'}
      </CardFooter>
    </Card>
  );
}
