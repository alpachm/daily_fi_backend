import { type Request, type Response } from 'express';
import type { LoginInput, RegisterInput } from '../interfaces/auth.interface';
import { User } from '../models';
import { loginUser, registerUser } from '../services/auth.service';
import { asyncHandler } from '../utils/asyncHandler';

export const register = asyncHandler(async (req: Request, res: Response) => {
  const user = await registerUser(req.body as RegisterInput);
  res.status(201).json({ status: 'success', data: user });
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const result = await loginUser(req.body as LoginInput);
  res.status(200).json({ status: 'success', data: result });
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  const { pk_user } = req.user!;

  await User.increment('token_version', { where: { pk_user } });

  res.status(200).json({
    status: 'success',
    data: { message: 'Logged out successfully' },
  });
});
