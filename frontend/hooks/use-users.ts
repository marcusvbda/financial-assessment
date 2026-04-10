'use client';

import { useQuery } from '@tanstack/react-query';

export interface User {
  id: number;
  name: string;
  email: string;
  role: string;
}

async function fetchUsers(): Promise<User[]> {
  const res = await fetch('/api/protected/users');
  if (!res.ok) throw new Error('Failed to fetch users');
  return res.json();
}

export function useUsersQuery({ enabled = true }: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: ['users'],
    queryFn: fetchUsers,
    enabled,
  });
}
