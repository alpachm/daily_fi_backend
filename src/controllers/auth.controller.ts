import { type Request, type Response } from 'express';
import type { LoginInput, RegisterInput } from '../interfaces/auth.interface';
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
