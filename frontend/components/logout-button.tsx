'use client';

import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';

import { Button } from '@/components/ui/button';

export function LogoutButton() {
  const router = useRouter();
  const logoutMutation = useMutation({
    mutationFn: async () => {
      await fetch('/api/session/logout', {
        method: 'POST',
      });
    },
    onSettled: () => {
      router.push('/');
      router.refresh();
    },
  });

  function handleLogout() {
    logoutMutation.mutate();
  }

  return (
    <Button
      type="button"
      variant="outline"
      onClick={handleLogout}
      disabled={logoutMutation.isPending}
    >
      {logoutMutation.isPending ? 'Signing out...' : 'Sign out'}
    </Button>
  );
}
