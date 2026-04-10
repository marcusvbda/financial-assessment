'use client';

import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';

export function useLogoutMutation() {
  const router = useRouter();

  return useMutation({
    mutationFn: async () => {
      await fetch('/api/session/logout', { method: 'POST' });
    },
    onSettled: () => {
      router.push('/');
      router.refresh();
    },
  });
}
