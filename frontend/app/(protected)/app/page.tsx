import { redirect } from 'next/navigation';

import { TransactionListView } from '@/components/transactions/transaction-list-view';
import { getCurrentUser } from '@/lib/auth/server';

export default async function AppPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/');
  }

  return <TransactionListView user={user} />;
}
