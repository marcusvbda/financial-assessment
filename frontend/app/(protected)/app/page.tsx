import { redirect } from 'next/navigation';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getCurrentUser } from '@/lib/auth/server';

export default async function AppPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <main className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-6xl px-4 py-10 sm:px-6">
      <div className="flex w-full flex-col gap-6">
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Signed-in area
          </p>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Welcome, {user.name}
          </h1>
          <p className="text-muted-foreground">
            You are authenticated and can now access protected content.
          </p>
        </div>

        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle>Account summary</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm sm:text-base">
            <p>
              <span className="font-medium">Name:</span> {user.name}
            </p>
            <p>
              <span className="font-medium">Email:</span> {user.email}
            </p>
            <p>
              <span className="font-medium">Role:</span> {user.role}
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
