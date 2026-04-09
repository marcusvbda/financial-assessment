import { z } from 'zod';

function luhn(cardNumber: string): boolean {
  let sum = 0;
  let alternate = false;
  for (let i = cardNumber.length - 1; i >= 0; i--) {
    let digit = parseInt(cardNumber[i], 10);
    if (alternate) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    alternate = !alternate;
  }
  return sum % 10 === 0;
}

function isExpired(dueDate: string): boolean {
  const [month, year] = dueDate.split('/').map(Number);
  const now = new Date();
  const expiry = new Date(year, month - 1);
  const current = new Date(now.getFullYear(), now.getMonth());
  return expiry < current;
}

const cardBaseSchema = z.object({
  card_number: z
    .string()
    .regex(/^\d{16}$/, 'card_number must be 16 digits')
    .refine(luhn, 'invalid card number'),
  cvv: z.string().regex(/^\d{3}$/, 'cvv must be 3 digits'),
  due_date: z
    .string()
    .regex(/^(0[1-9]|1[0-2])\/\d{4}$/, 'due_date must be MM/YYYY')
    .refine((val) => !isExpired(val), 'card is expired'),
  amount: z.number().positive('amount must be positive'),
  holder: z.string().min(1, 'holder is required'),
});

export const createTransactionSchema = cardBaseSchema;

export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;
