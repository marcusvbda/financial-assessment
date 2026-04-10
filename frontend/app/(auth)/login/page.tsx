import { redirect } from 'next/navigation';

import { LoginForm } from '@/components/login-form';
import { getCurrentUser } from '@/lib/auth/server';

export default async function LoginPage() {
  const user = await getCurrentUser();

  if (user) {
    redirect('/app');
  }

  return (
    <main className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-6xl items-center px-4 py-10 sm:px-6">
      <div className="grid w-full gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="flex flex-col justify-center gap-4">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Secure access
          </p>
          <h1 className="max-w-xl text-4xl font-semibold tracking-tight sm:text-5xl">
            Access your financial workspace.
          </h1>
          <p className="max-w-xl text-base text-muted-foreground sm:text-lg">
            Log in to continue or create a new account to start using the system.
          </p>
        </div>

        <div className="w-full max-w-md justify-self-end">
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
