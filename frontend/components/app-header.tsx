import Link from 'next/link';

import { AuthDialog } from '@/components/auth-dialog';
import type { SessionUser } from '@/lib/auth/server';
import { LogoutButton } from '@/components/logout-button';
import { Button } from '@/components/ui/button';

interface AppHeaderProps {
  user: SessionUser | null;
}

export function AppHeader({ user }: AppHeaderProps) {
  return (
    <header className="border-b bg-background">
      <div className="mx-auto flex min-h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="font-semibold tracking-tight">
          Neo Financial Assessment
        </Link>

        <div className="flex items-center gap-3">
          {user ? (
            <>
              <div className="hidden text-right sm:block">
                <p className="text-sm font-medium">{user.name}</p>
                <p className="text-xs text-muted-foreground">{user.email}</p>
              </div>
              <Button asChild variant="ghost">
                <Link href="/app">Dashboard</Link>
              </Button>
              <LogoutButton />
            </>
          ) : (
            <AuthDialog
              openLabel="Log in"
              description="Sign in or create an account to continue with the checkout."
            />
          )}
        </div>
      </div>
    </header>
  );
}
