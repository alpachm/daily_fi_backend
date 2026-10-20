import { type Request, type Response } from 'express';
import type {
  ChangePasswordInput,
  DeleteAccountInput,
  ForgotPasswordInput,
  ResetPasswordInput,
} from '../interfaces/user.interface';
import {
  changePassword,
  deleteAccount,
  requestPasswordReset,
  resetUserPassword,
} from '../services/user.service';
import { asyncHandler } from '../utils/asyncHandler';

export const changePasswordHandler = asyncHandler(async (req: Request, res: Response) => {
  const { pk_user } = req.user!;
  await changePassword(pk_user, req.body as ChangePasswordInput);
  res.status(200).json({
    status: 'success',
    data: { message: 'Password updated successfully' },
  });
});

export const forgotPasswordHandler = asyncHandler(async (req: Request, res: Response) => {
  await requestPasswordReset(req.body as ForgotPasswordInput);

  // Generic response regardless of whether the email exists (prevents user
  // enumeration).
  res.status(200).json({
    status: 'success',
    data: {
      message:
        'If an account exists for that email, a password reset link has been sent.',
    },
  });
});

export const resetPasswordHandler = asyncHandler(async (req: Request, res: Response) => {
  await resetUserPassword(req.body as ResetPasswordInput);

  res.status(200).json({
    status: 'success',
    data: { message: 'Password reset successfully' },
  });
});

export const deleteAccountHandler = asyncHandler(async (req: Request, res: Response) => {
  const { pk_user } = req.user!;
  await deleteAccount(pk_user, (req.body as DeleteAccountInput).password);
  res.status(200).json({
    status: 'success',
    data: { message: 'Account deleted successfully' },
  });
});
