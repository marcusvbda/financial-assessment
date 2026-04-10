'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { SessionUser } from '@/lib/auth/server';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

// ─── Types ────────────────────────────────────────────────────────────────────

type TransactionStatus = 'posted' | 'pending' | 'reversed';

interface Transaction {
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

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 10;

const STATUS_LABEL: Record<TransactionStatus, string> = {
  pending: 'Pending',
  posted: 'Posted',
  reversed: 'Reversed',
};

const STATUS_CLASS: Record<TransactionStatus, string> = {
  pending: 'bg-amber-100 text-amber-800',
  posted: 'bg-green-100 text-green-800',
  reversed: 'bg-slate-100 text-slate-500',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatAmount(amount: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

function formatDate(iso: string) {
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(new Date(iso));
}

// ─── API ──────────────────────────────────────────────────────────────────────

async function fetchTransactions(userId?: number): Promise<Transaction[]> {
  const params = new URLSearchParams();
  if (userId) params.set('user_id', String(userId));
  const qs = params.toString();
  const res = await fetch(`/api/protected/transactions${qs ? `?${qs}` : ''}`);
  if (!res.ok) throw new Error('Failed to fetch transactions');
  return res.json();
}

async function fetchUsers(): Promise<User[]> {
  const res = await fetch('/api/protected/users');
  if (!res.ok) throw new Error('Failed to fetch users');
  return res.json();
}

async function reverseTransaction(id: number): Promise<Transaction> {
  const res = await fetch(`/api/protected/transactions/${id}/reverse`, { method: 'POST' });
  const data = (await res.json().catch(() => ({}))) as { error?: string } & Partial<Transaction>;
  if (!res.ok) throw new Error(data.error ?? 'Failed to reverse transaction');
  return data as Transaction;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: TransactionStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_CLASS[status]}`}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

function ReverseButton({
  transactionId,
  isPending,
  isThisOne,
  error,
  onReverse,
}: {
  transactionId: number;
  isPending: boolean;
  isThisOne: boolean;
  error: string | null;
  onReverse: (id: number) => void;
}) {
  return (
    <div className="flex flex-col items-end gap-1">
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <button
            disabled={isPending}
            className="inline-flex items-center rounded-md border border-destructive/40 px-3 py-1 text-xs font-medium text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-50"
          >
            {isThisOne && isPending ? 'Reversing…' : 'Reverse'}
          </button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reverse transaction?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently reverse transaction #{transactionId}. This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => onReverse(transactionId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Reverse
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {isThisOne && error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

function Skeleton() {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-14 animate-pulse rounded-lg bg-muted" />
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-muted-foreground">
      <p className="text-sm">No transactions found.</p>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  user: SessionUser;
}

export function TransactionListView({ user }: Props) {
  const isManager = user.role === 'manager';
  const queryClient = useQueryClient();

  const [statusFilter, setStatusFilter] = useState<TransactionStatus | 'all'>('all');
  const [userIdFilter, setUserIdFilter] = useState<number | undefined>(undefined);
  const [page, setPage] = useState(1);

  // ── Queries ────────────────────────────────────────────────────────────────

  const transactionsQuery = useQuery({
    queryKey: ['transactions', { userId: userIdFilter }],
    queryFn: () => fetchTransactions(userIdFilter),
  });

  const usersQuery = useQuery({
    queryKey: ['users'],
    queryFn: fetchUsers,
    enabled: isManager,
  });

  // ── Mutation ───────────────────────────────────────────────────────────────

  const reverseMutation = useMutation({
    mutationFn: reverseTransaction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
  });

  // ── Derived data ───────────────────────────────────────────────────────────

  const allTransactions = transactionsQuery.data ?? [];

  const filtered =
    statusFilter === 'all' ? allTransactions : allTransactions.filter((t) => t.status === statusFilter);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePageClamp = Math.min(page, totalPages);
  const paginated = filtered.slice((safePageClamp - 1) * PAGE_SIZE, safePageClamp * PAGE_SIZE);

  const usersMap = new Map((usersQuery.data ?? []).map((u) => [u.id, u.name]));

  // ── Handlers ───────────────────────────────────────────────────────────────

  function handleStatusChange(value: string) {
    setStatusFilter(value as TransactionStatus | 'all');
    setPage(1);
  }

  function handleUserChange(value: string) {
    setUserIdFilter(value === '' ? undefined : Number(value));
    setPage(1);
  }

  function handleReverse(id: number) {
    reverseMutation.reset();
    reverseMutation.mutate(id);
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <main className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-6xl flex-col px-4 py-10 sm:px-6">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-1">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
          Signed-in area
        </p>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Transactions</h1>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-muted-foreground" htmlFor="status-filter">
            Status
          </label>
          <select
            id="status-filter"
            value={statusFilter}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="h-9 rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="all">All statuses</option>
            <option value="pending">Pending</option>
            <option value="posted">Posted</option>
            <option value="reversed">Reversed</option>
          </select>
        </div>

        {isManager && (
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground" htmlFor="user-filter">
              User
            </label>
            <select
              id="user-filter"
              value={userIdFilter ?? ''}
              onChange={(e) => handleUserChange(e.target.value)}
              disabled={usersQuery.isLoading}
              className="h-9 rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
            >
              <option value="">All users</option>
              {(usersQuery.data ?? []).map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {(statusFilter !== 'all' || userIdFilter !== undefined) && (
          <div className="flex flex-col justify-end">
            <button
              onClick={() => {
                setStatusFilter('all');
                setUserIdFilter(undefined);
                setPage(1);
              }}
              className="h-9 rounded-md border px-3 text-sm text-muted-foreground transition-colors hover:bg-muted"
            >
              Clear filters
            </button>
          </div>
        )}
      </div>

      {/* Count */}
      {!transactionsQuery.isLoading && !transactionsQuery.isError && (
        <p className="mb-3 text-sm text-muted-foreground">
          {filtered.length} {filtered.length === 1 ? 'transaction' : 'transactions'}
        </p>
      )}

      {/* Content */}
      {transactionsQuery.isLoading ? (
        <Skeleton />
      ) : transactionsQuery.isError ? (
        <p className="text-sm text-destructive" role="alert">
          Failed to load transactions. Please try again.
        </p>
      ) : paginated.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden overflow-hidden rounded-lg border md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">ID</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Holder</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Card</th>
                  {isManager && (
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">User</th>
                  )}
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                    Amount
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Date</th>
                  {isManager && (
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y">
                {paginated.map((t) => (
                  <tr key={t.id} className="bg-background transition-colors hover:bg-muted/30">
                    <td className="px-4 py-3 tabular-nums text-muted-foreground">#{t.id}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={t.status} />
                    </td>
                    <td className="px-4 py-3 font-medium">{t.holder}</td>
                    <td className="px-4 py-3 text-muted-foreground">•••• {t.last_digits}</td>
                    {isManager && (
                      <td className="px-4 py-3 text-muted-foreground">
                        {usersMap.get(t.user_id) ?? `#${t.user_id}`}
                      </td>
                    )}
                    <td className="px-4 py-3 text-right font-medium tabular-nums">
                      {formatAmount(t.amount)}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDate(t.created_at)}</td>
                    {isManager && (
                      <td className="px-4 py-3 text-right">
                        {t.status === 'posted' && (
                          <ReverseButton
                            transactionId={t.id}
                            isPending={reverseMutation.isPending}
                            isThisOne={reverseMutation.variables === t.id}
                            error={
                              reverseMutation.variables === t.id && reverseMutation.error
                                ? (reverseMutation.error as Error).message
                                : null
                            }
                            onReverse={handleReverse}
                          />
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="flex flex-col gap-3 md:hidden">
            {paginated.map((t) => (
              <div key={t.id} className="rounded-lg border bg-card p-4">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <StatusBadge status={t.status} />
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {formatDate(t.created_at)}
                  </span>
                </div>

                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-col gap-0.5">
                    <p className="font-medium">{t.holder}</p>
                    <p className="text-sm text-muted-foreground">•••• {t.last_digits}</p>
                    {isManager && (
                      <p className="text-xs text-muted-foreground">
                        {usersMap.get(t.user_id) ?? `User #${t.user_id}`}
                      </p>
                    )}
                  </div>
                  <p className="whitespace-nowrap font-semibold tabular-nums">
                    {formatAmount(t.amount)}
                  </p>
                </div>

                {isManager && t.status === 'posted' && (
                  <div className="mt-3 border-t pt-3">
                    <ReverseButton
                      transactionId={t.id}
                      isPending={reverseMutation.isPending}
                      isThisOne={reverseMutation.variables === t.id}
                      error={
                        reverseMutation.variables === t.id && reverseMutation.error
                          ? (reverseMutation.error as Error).message
                          : null
                      }
                      onReverse={handleReverse}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
              <p className="text-sm text-muted-foreground">
                Page {safePageClamp} of {totalPages}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={safePageClamp === 1}
                  className="h-9 rounded-md border px-4 text-sm transition-colors hover:bg-muted disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safePageClamp === totalPages}
                  className="h-9 rounded-md border px-4 text-sm transition-colors hover:bg-muted disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </main>
  );
}
