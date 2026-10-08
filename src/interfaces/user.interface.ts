import { z } from 'zod';
import {
  changePasswordSchema,
  deleteAccountSchema,
} from '../validations/user.validation';

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type DeleteAccountInput = z.infer<typeof deleteAccountSchema>;
