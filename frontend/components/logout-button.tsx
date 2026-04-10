'use client';

import { useLogoutMutation } from '@/hooks/use-logout';

import { Button } from '@/components/ui/button';

export function LogoutButton() {
  const logoutMutation = useLogoutMutation();

  return (
    <Button
      type="button"
      variant="outline"
      onClick={() => logoutMutation.mutate()}
      disabled={logoutMutation.isPending}
    >
      {logoutMutation.isPending ? 'Signing out...' : 'Sign out'}
    </Button>
  );
}
