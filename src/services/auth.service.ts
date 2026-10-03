import * as bcrypt from 'bcrypt';
import type { LoginInput, RegisterInput } from '../interfaces/auth.interface';
import { User } from '../models';
import { AppError } from '../utils/AppError';
import { signAccessToken } from '../utils/jwt';

const BCRYPT_SALT_ROUNDS = 12;

export interface RegisterResult {
  id: number;
  email: string;
}

export interface LoginResult {
  token: string;
  user: {
    id: number;
    email: string;
  };
}

export async function registerUser(input: RegisterInput): Promise<RegisterResult> {
  const existing = await User.findOne({ where: { email: input.email } });

  if (existing) {
    throw new AppError('User already exists', 409);
  }

  const hashedPassword = await bcrypt.hash(input.password, BCRYPT_SALT_ROUNDS);
  const user = await User.create({ email: input.email, password: hashedPassword });

  return { id: user.pk_user, email: user.email };
}

export async function loginUser(input: LoginInput): Promise<LoginResult> {
  const user = await User.findOne({ where: { email: input.email } });

  if (!user) {
    throw new AppError('Invalid email or password', 401);
  }

  const isPasswordValid = await bcrypt.compare(input.password, user.password);

  if (!isPasswordValid) {
    throw new AppError('Invalid email or password', 401);
  }

  const token = signAccessToken({ sub: String(user.pk_user), email: user.email });

  return { token, user: { id: user.pk_user, email: user.email } };
}
