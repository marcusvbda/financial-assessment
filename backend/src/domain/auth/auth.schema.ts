import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('invalid email'),
  password: z.string().min(1, 'password is required'),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const registerSchema = z
  .object({
    name: z.string().min(1, 'name is required'),
    email: z.string().email('invalid email'),
    password: z.string().min(6, 'password must be at least 6 characters'),
    confirm_password: z.string().min(1, 'confirm_password is required'),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: 'passwords do not match',
    path: ['confirm_password'],
  });

export type RegisterInput = z.infer<typeof registerSchema>;
