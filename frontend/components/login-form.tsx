'use client';

import { useState } from 'react';
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
import {
  type AuthFieldErrors,
  type AuthMode,
  loginSchema,
  registerSchema,
  useAuthMutation,
} from '@/hooks/use-auth';
import { cn } from '@/lib/utils';

interface LoginFormProps {
  defaultMode?: AuthMode;
  redirectTo?: string | null;
  onSuccess?: () => void;
}

export function LoginForm({
  defaultMode = 'login',
  redirectTo = '/app',
  onSuccess,
}: LoginFormProps) {
  const [mode, setMode] = useState<AuthMode>(defaultMode);
  const [fieldErrors, setFieldErrors] = useState<AuthFieldErrors>({});

  const authMutation = useAuthMutation({ mode, redirectTo, onSuccess });

  async function handleSubmit(event: { preventDefault(): void; currentTarget: HTMLFormElement }) {
    event.preventDefault();
    setFieldErrors({});
    authMutation.reset();

    try {
      await authMutation.mutateAsync(new FormData(event.currentTarget));
    } catch (error) {
      if (error instanceof z.ZodError) {
        const nextErrors: AuthFieldErrors = {};
        for (const issue of error.issues) {
          const key = issue.path[0];
          if (typeof key === 'string' && !nextErrors[key as keyof AuthFieldErrors]) {
            nextErrors[key as keyof AuthFieldErrors] = issue.message;
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

// Re-export schemas so they remain accessible to consumers that may need them
export { loginSchema, registerSchema };
