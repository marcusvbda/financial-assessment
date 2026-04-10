import type { Metadata } from 'next';
import { Inter } from 'next/font/google';

import './globals.css';
import { AppHeader } from '@/components/app-header';
import { Providers } from '@/components/providers';
import { getCurrentUser } from '@/lib/auth/server';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Hypothetical credit card company',
  description: 'Credit card transaction management',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          <div className="min-h-screen bg-background text-foreground">
            <AppHeader user={user} />
            {children}
          </div>
        </Providers>
      </body>
    </html>
  );
}
