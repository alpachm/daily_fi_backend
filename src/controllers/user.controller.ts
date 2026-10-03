import { type Request, type Response } from 'express';
import type {
  ChangePasswordInput,
  DeleteAccountInput,
} from '../interfaces/user.interface';
import { changePassword, deleteAccount } from '../services/user.service';
import { asyncHandler } from '../utils/asyncHandler';

export const changePasswordHandler = asyncHandler(async (req: Request, res: Response) => {
  const { pk_user } = req.user!;
  await changePassword(pk_user, req.body as ChangePasswordInput);
  res.status(200).json({
    status: 'success',
    data: { message: 'Password updated successfully' },
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
