import { notFound } from 'next/navigation';

import { TransactionStatusTracker } from '@/components/transaction-status-tracker';
import { protectedBackendRequest } from '@/lib/auth/server';

type TransactionStatus = 'posted' | 'pending' | 'reversed';

interface Transaction {
  id: number;
  status: TransactionStatus;
}

interface ThankYouPageProps {
  searchParams: Promise<{
    transaction_id?: string;
  }>;
}

export default async function ThankYouPage({ searchParams }: ThankYouPageProps) {
  const { transaction_id } = await searchParams;
  const parsedTransactionId = transaction_id ? Number(transaction_id) : NaN;
  const socketUrl = process.env.NEXT_PUBLIC_BACKEND_URL!;

  if (!Number.isInteger(parsedTransactionId)) {
    notFound();
  }

  const response = await protectedBackendRequest(`/api/transactions/${parsedTransactionId}`);

  if (response.status === 401) {
    notFound();
  }

  if (response.status === 404) {
    notFound();
  }

  if (!response.ok) {
    notFound();
  }

  const transaction = (await response.json()) as Transaction;

  return (
    <main className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-3xl items-center px-4 py-10 sm:px-6">
      <div className="w-full rounded-3xl border border-border/60 bg-card p-8 shadow-sm sm:p-10">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
          Payment submitted
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight">Thank you for your purchase</h1>
        <p className="mt-4 text-base leading-7 text-muted-foreground">
          Your transaction is being processed and will stay in pending status until the async
          gateway update is implemented on the frontend.
        </p>
        <div className="mt-8 rounded-2xl border border-border/60 bg-muted/30 p-5">
          <p className="text-sm font-medium text-muted-foreground">Transaction ID</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight">
            {transaction_id ?? 'Unavailable'}
          </p>
        </div>

        <TransactionStatusTracker
          initialStatus={transaction.status}
          socketUrl={socketUrl}
          transactionId={transaction.id}
        />
      </div>
    </main>
  );
}
