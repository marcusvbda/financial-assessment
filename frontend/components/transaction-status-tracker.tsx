'use client';

import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

type TransactionStatus = 'posted' | 'pending' | 'reversed';

interface TransactionStatusTrackerProps {
  initialStatus: TransactionStatus;
  socketUrl: string;
  transactionId: number;
}

function Spinner() {
  return (
    <span className="inline-flex h-5 w-5 animate-spin rounded-full border-2 border-foreground/20 border-t-foreground" />
  );
}

export function TransactionStatusTracker({
  initialStatus,
  socketUrl,
  transactionId,
}: TransactionStatusTrackerProps) {
  const [status, setStatus] = useState<TransactionStatus>(initialStatus);

  useEffect(() => {
    if (!socketUrl || status !== 'pending') {
      return undefined;
    }

    const socket = io(socketUrl, {
      transports: ['websocket'],
    });

    function handleUpdate(payload: { status?: TransactionStatus }) {
      if (payload.status) {
        setStatus(payload.status);
      }
    }

    socket.on(`transaction-update-${transactionId}`, handleUpdate);

    return () => {
      socket.off(`transaction-update-${transactionId}`, handleUpdate);
      socket.disconnect();
    };
  }, [socketUrl, status, transactionId]);

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

  if (status === 'reversed') {
    return (
      <div className="mt-8 rounded-2xl border border-red-300/60 bg-red-50 p-5 text-red-950">
        <p className="text-sm font-medium uppercase tracking-[0.18em] text-red-700">
          Payment reversed
        </p>
        <p className="mt-1 text-base font-medium">
          This transaction was reversed and the payment is no longer active.
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
