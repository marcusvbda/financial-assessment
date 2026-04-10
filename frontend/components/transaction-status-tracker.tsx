'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { io } from 'socket.io-client';

type TransactionStatus = 'posted' | 'pending' | 'reversed';

interface Transaction {
  id: number;
  status: TransactionStatus;
}

interface TransactionStatusTrackerProps {
  socketUrl: string;
  transactionId?: number;
}

async function fetchTransaction(transactionId: number): Promise<Transaction | null> {
  const response = await fetch('/api/protected/transactions', {
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error('Failed to load transaction status.');
  }

  const transactions = (await response.json()) as Transaction[];
  return transactions.find((transaction) => transaction.id === transactionId) ?? null;
}

function Spinner() {
  return (
    <span className="inline-flex h-5 w-5 animate-spin rounded-full border-2 border-foreground/20 border-t-foreground" />
  );
}

export function TransactionStatusTracker({
  socketUrl,
  transactionId,
}: TransactionStatusTrackerProps) {
  const transactionQuery = useQuery({
    queryKey: ['transaction', transactionId],
    queryFn: () => fetchTransaction(transactionId!),
    enabled: typeof transactionId === 'number',
    refetchOnWindowFocus: false,
  });

  const [liveStatus, setLiveStatus] = useState<TransactionStatus | null>(null);
  const status = liveStatus ?? transactionQuery.data?.status ?? null;

  useEffect(() => {
    if (!transactionId || status !== 'pending') {
      return undefined;
    }

    const socket = io(socketUrl, {
      transports: ['websocket'],
    });

    function handleUpdate(payload: { status?: TransactionStatus }) {
      if (payload.status) {
        setLiveStatus(payload.status);
      }
    }

    socket.on(`transaction-update-${transactionId}`, handleUpdate);

    return () => {
      socket.off(`transaction-update-${transactionId}`, handleUpdate);
      socket.disconnect();
    };
  }, [socketUrl, status, transactionId]);

  if (!transactionId) {
    return (
      <div className="mt-8 rounded-2xl border border-destructive/30 bg-destructive/5 p-5 text-sm text-destructive">
        Transaction ID is missing from the URL.
      </div>
    );
  }

  if (transactionQuery.isLoading) {
    return (
      <div className="mt-8 flex items-center gap-3 rounded-2xl border border-border/60 bg-muted/30 p-5">
        <Spinner />
        <div>
          <p className="text-sm font-medium text-muted-foreground">Loading transaction</p>
          <p className="text-sm text-muted-foreground">Checking the latest payment status.</p>
        </div>
      </div>
    );
  }

  if (transactionQuery.isError) {
    return (
      <div className="mt-8 rounded-2xl border border-destructive/30 bg-destructive/5 p-5 text-sm text-destructive">
        {transactionQuery.error.message}
      </div>
    );
  }

  if (!transactionQuery.data) {
    return (
      <div className="mt-8 rounded-2xl border border-border/60 bg-muted/30 p-5">
        <p className="text-sm font-medium text-muted-foreground">Transaction not found</p>
        <p className="mt-1 text-sm text-muted-foreground">
          We could not find the payment record for transaction #{transactionId}.
        </p>
      </div>
    );
  }

  if (status === 'pending') {
    return (
      <div className="mt-8 rounded-2xl border border-amber-300/60 bg-amber-50 p-5 text-amber-950">
        <div className="flex items-center gap-3">
          <Spinner />
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-amber-700">
              Payment processing
            </p>
            <p className="mt-1 text-base font-medium">
              Your transaction is still pending and waiting for gateway confirmation.
            </p>
          </div>
        </div>
        <p className="mt-4 text-sm text-amber-800">
          This page is listening for the backend event and will update automatically when the
          transaction is posted.
        </p>
      </div>
    );
  }

  if (status === 'posted') {
    return (
      <div className="mt-8 rounded-2xl border border-emerald-300/60 bg-emerald-50 p-5 text-emerald-950">
        <p className="text-sm font-medium uppercase tracking-[0.18em] text-emerald-700">
          Payment confirmed
        </p>
        <p className="mt-1 text-base font-medium">
          The backend postback was received and your transaction is now posted.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-8 rounded-2xl border border-slate-300/60 bg-slate-50 p-5 text-slate-900">
      <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-600">
        Transaction updated
      </p>
      <p className="mt-1 text-base font-medium">Current payment status: {status}.</p>
    </div>
  );
}
