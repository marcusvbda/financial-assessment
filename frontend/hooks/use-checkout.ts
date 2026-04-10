'use client';

import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { z } from 'zod';

export type CheckoutFieldErrors = Partial<
  Record<'holder' | 'card_number' | 'cvv' | 'due_date', string>
>;

export const checkoutSchema = z.object({
  holder: z.string().min(1, 'Cardholder name is required.'),
  card_number: z.string().regex(/^\d{16}$/, 'Card number must have 16 digits.'),
  cvv: z.string().regex(/^\d{3}$/, 'CVV must have 3 digits.'),
  due_date: z
    .string()
    .regex(/^(0[1-9]|1[0-2])\/\d{4}$/, 'Expiration date must be in MM/YYYY format.'),
});

interface TransactionResponse {
  id: number;
}

export function useCheckoutMutation(productPrice: number) {
  const router = useRouter();

  return useMutation({
    mutationFn: async (formData: FormData) => {
      const parsed = checkoutSchema.safeParse({
        holder: formData.get('holder'),
        card_number: String(formData.get('card_number') ?? '').replace(/\s+/g, ''),
        cvv: formData.get('cvv'),
        due_date: formData.get('due_date'),
      });

      if (!parsed.success) throw parsed.error;

      const res = await fetch('/api/protected/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...parsed.data, amount: productPrice }),
      });

      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        errors?: Record<string, string[] | undefined>;
        id?: number;
      };

      if (!res.ok) {
        if (res.status === 401) throw new Error('Please log in before completing the checkout.');

        if (data.errors) {
          const fieldErrors: CheckoutFieldErrors = {};
          for (const key of Object.keys(data.errors) as Array<keyof CheckoutFieldErrors>) {
            const message = data.errors[key]?.[0];
            if (message) fieldErrors[key] = message;
          }
          const err = new Error('Checkout validation failed.');
          (err as Error & { fieldErrors?: CheckoutFieldErrors }).fieldErrors = fieldErrors;
          throw err;
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
}
