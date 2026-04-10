'use client';

import { type FormEvent, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { SessionUser } from '@/lib/auth/server';
import LockWall from './lock-wall';

const PRODUCT_PRICE = 249;

const checkoutSchema = z.object({
  holder: z.string().min(1, 'Cardholder name is required.'),
  card_number: z.string().regex(/^\d{16}$/, 'Card number must have 16 digits.'),
  cvv: z.string().regex(/^\d{3}$/, 'CVV must have 3 digits.'),
  due_date: z
    .string()
    .regex(/^(0[1-9]|1[0-2])\/\d{4}$/, 'Expiration date must be in MM/YYYY format.'),
});

type CheckoutFieldErrors = Partial<Record<'holder' | 'card_number' | 'cvv' | 'due_date', string>>;

interface PublicCheckoutProps {
  user: SessionUser | null;
}

interface TransactionResponse {
  id: number;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value);
}

function formatCardNumber(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 16);
  return digits.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
}

function formatCvv(value: string) {
  return value.replace(/\D/g, '').slice(0, 3);
}

function formatDueDate(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 6);

  if (digits.length <= 2) {
    return digits;
  }

  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

export function PublicCheckout({ user }: PublicCheckoutProps) {
  const router = useRouter();
  const [fieldErrors, setFieldErrors] = useState<CheckoutFieldErrors>({});
  const [cardNumberValue, setCardNumberValue] = useState('');
  const [cvvValue, setCvvValue] = useState('');
  const [dueDateValue, setDueDateValue] = useState('');

  const checkoutMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const parsed = checkoutSchema.safeParse({
        holder: formData.get('holder'),
        card_number: String(formData.get('card_number') ?? '').replace(/\s+/g, ''),
        cvv: formData.get('cvv'),
        due_date: formData.get('due_date'),
      });

      if (!parsed.success) {
        throw parsed.error;
      }

      const response = await fetch('/api/protected/transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...parsed.data,
          amount: PRODUCT_PRICE,
        }),
      });

      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
        errors?: Record<string, string[] | undefined>;
        id?: number;
      };

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Please log in before completing the checkout.');
        }

        if (data.errors) {
          const nextErrors: CheckoutFieldErrors = {};

          for (const key of Object.keys(data.errors) as Array<keyof CheckoutFieldErrors>) {
            const message = data.errors[key]?.[0];
            if (message) {
              nextErrors[key] = message;
            }
          }

          const validationError = new Error('Checkout validation failed.');
          (validationError as Error & { fieldErrors?: CheckoutFieldErrors }).fieldErrors =
            nextErrors;
          throw validationError;
        }

        throw new Error(data.error ?? 'Unable to process the payment right now.');
      }

      return data as TransactionResponse;
    },
    onSuccess: (transaction) => {
      router.push(`/checkout/thank-you?transaction_id=${transaction.id}`);
      router.refresh();
    },
  });

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!user) {
      return;
    }

    setFieldErrors({});
    checkoutMutation.reset();

    try {
      await checkoutMutation.mutateAsync(new FormData(event.currentTarget));
    } catch (error) {
      if (error instanceof z.ZodError) {
        const nextErrors: CheckoutFieldErrors = {};

        for (const issue of error.issues) {
          const key = issue.path[0];
          if (typeof key === 'string' && !nextErrors[key as keyof CheckoutFieldErrors]) {
            nextErrors[key as keyof CheckoutFieldErrors] = issue.message;
          }
        }

        setFieldErrors(nextErrors);
        return;
      }

      const fieldErrorMap = (error as Error & { fieldErrors?: CheckoutFieldErrors }).fieldErrors;
      if (fieldErrorMap) {
        setFieldErrors(fieldErrorMap);
      }
    }
  }

  return (
    <main className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-6xl items-center px-4 py-10 sm:px-6">
      <div className="grid w-full gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <Card className="border-border/60 bg-card">
          <CardHeader className="gap-4 border-b border-border/60">
            <div className="flex flex-col gap-2">
              <CardTitle className="text-3xl">Hypothetical Product</CardTitle>
              <CardDescription className="max-w-xl text-base leading-7">
                Lorem ipsum dolor sit amet consectetur adipiscing elit. Lorem ipsum dolor sit amet
                consectetur adipiscing elit. Lorem ipsum dolor sit amet consectetur adipiscing elit.
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="flex flex-col gap-8 pt-6">
            <div className="rounded-2xl border border-border/60 bg-muted/30 p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-2">
                  <h2 className="text-4xl font-semibold tracking-tight">
                    {formatCurrency(PRODUCT_PRICE)}
                  </h2>
                </div>
              </div>
              <div className="mt-6 grid gap-3 text-sm text-muted-foreground sm:grid-cols-2">
                <div className="rounded-xl border border-border/60 bg-background p-4">
                  Lorem ipsum dolor sit amet consectetur adipiscing elit.
                </div>
                <div className="rounded-xl border border-border/60 bg-background p-4">
                  Lorem ipsum dolor sit amet consectetur adipiscing elit.
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-border/60">
          <CardHeader>
            <CardTitle>Checkout</CardTitle>
            <CardDescription>
              Pay securely with your credit card to activate the product.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
              <div className="flex flex-col gap-2">
                <Label htmlFor="holder">Cardholder name</Label>
                <Input
                  id="holder"
                  name="holder"
                  placeholder="Jane Doe"
                  defaultValue={user?.name ?? ''}
                  disabled={!user || checkoutMutation.isPending}
                />
                {fieldErrors.holder && (
                  <p className="text-sm text-destructive">{fieldErrors.holder}</p>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="card_number">Card number</Label>
                <Input
                  id="card_number"
                  name="card_number"
                  inputMode="numeric"
                  placeholder="4111 1111 1111 1111"
                  maxLength={19}
                  value={cardNumberValue}
                  disabled={!user || checkoutMutation.isPending}
                  onChange={(event) => setCardNumberValue(formatCardNumber(event.target.value))}
                />
                {fieldErrors.card_number && (
                  <p className="text-sm text-destructive">{fieldErrors.card_number}</p>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="due_date">Expiration date</Label>
                  <Input
                    id="due_date"
                    name="due_date"
                    inputMode="numeric"
                    placeholder="12/2030"
                    maxLength={7}
                    value={dueDateValue}
                    disabled={!user || checkoutMutation.isPending}
                    onChange={(event) => setDueDateValue(formatDueDate(event.target.value))}
                  />
                  {fieldErrors.due_date && (
                    <p className="text-sm text-destructive">{fieldErrors.due_date}</p>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="cvv">CVV</Label>
                  <Input
                    id="cvv"
                    name="cvv"
                    inputMode="numeric"
                    placeholder="123"
                    maxLength={3}
                    value={cvvValue}
                    disabled={!user || checkoutMutation.isPending}
                    onChange={(event) => setCvvValue(formatCvv(event.target.value))}
                  />
                  {fieldErrors.cvv && <p className="text-sm text-destructive">{fieldErrors.cvv}</p>}
                </div>
              </div>

              {checkoutMutation.error && (
                <p className="text-sm text-destructive">{checkoutMutation.error.message}</p>
              )}

              <Button
                className="w-full"
                disabled={!user || checkoutMutation.isPending}
                type="submit"
              >
                {checkoutMutation.isPending
                  ? 'Processing payment...'
                  : `Buy for ${formatCurrency(PRODUCT_PRICE)}`}
              </Button>
            </form>
          </CardContent>
          {!user && <LockWall />}
        </Card>
      </div>
    </main>
  );
}
