import { z } from 'zod';

const role = z.enum(['manager', 'client']);

export const createUserSchema = z.object({
  name: z.string().min(1, 'name is required'),
  email: z.string().email('invalid email'),
  password: z.string().min(6, 'password must be at least 6 characters'),
  role,
});

export const updateUserSchema = z
  .object({
    name: z.string().min(1).optional(),
    email: z.string().email('invalid email').optional(),
    password: z.string().min(6, 'password must be at least 6 characters').optional(),
    role: role.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: 'at least one field is required' });

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
