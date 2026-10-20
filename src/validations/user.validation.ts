import { z } from 'zod';
import { passwordSchema } from './auth.validation';

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: passwordSchema,
});

export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .pipe(z.email('Invalid email format')),
});

/**
 * Stronger password policy used when resetting a password: enforces at least
 * one lowercase letter, one uppercase letter and one digit on top of the
 * shared length limits.
 */
export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters long')
    .max(72, 'Password must be at most 72 characters long')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
});

export const deleteAccountSchema = z.object({
  password: z.string().min(1, 'Password is required'),
});
