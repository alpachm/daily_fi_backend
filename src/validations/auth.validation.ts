import { z } from 'zod';

/**
 * Shared password policy: minimum 8 characters and capped at 72 characters to
 * respect bcrypt's 72-byte input limit.
 */
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters long')
  .max(72, 'Password must be at most 72 characters long');

export const registerSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .pipe(z.email('Invalid email format')),
  password: passwordSchema,
});

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .pipe(z.email('Invalid email format')),
  password: z.string().min(1, 'Password is required'),
});
