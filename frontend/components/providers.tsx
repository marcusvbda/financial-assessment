'use client';

import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const FIVE_MINUTES = 1000 * 60 * 5;

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        retry: 0,
        staleTime: FIVE_MINUTES,
        gcTime: FIVE_MINUTES,
      },
    },
  });
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => createQueryClient());

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
