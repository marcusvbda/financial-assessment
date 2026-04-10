'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export type TransactionStatus = 'posted' | 'pending' | 'reversed';

export interface Transaction {
  id: number;
  user_id: number;
  status: TransactionStatus;
  card_id: string;
  last_digits: string;
  holder: string;
  amount: number;
  created_at: string;
  updated_at: string;
}

interface TransactionFilters {
  status?: TransactionStatus;
  userId?: number;
}

async function fetchTransactions({ status, userId }: TransactionFilters): Promise<Transaction[]> {
  const params = new URLSearchParams();
  if (status) params.set('status', status);
  if (userId) params.set('user_id', String(userId));
  const qs = params.toString();
  const res = await fetch(`/api/protected/transactions${qs ? `?${qs}` : ''}`);
  if (!res.ok) throw new Error('Failed to fetch transactions');
  return res.json();
}

async function reverseTransaction(id: number): Promise<Transaction> {
  const res = await fetch(`/api/protected/transactions/${id}/reverse`, { method: 'POST' });
  const data = (await res.json().catch(() => ({}))) as { error?: string } & Partial<Transaction>;
  if (!res.ok) throw new Error(data.error ?? 'Failed to reverse transaction');
  return data as Transaction;
}

export function useTransactionsQuery(filters: TransactionFilters) {
  return useQuery({
    queryKey: ['transactions', filters],
    queryFn: () => fetchTransactions(filters),
  });
}

export function useReverseTransactionMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: reverseTransaction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
  });
}
