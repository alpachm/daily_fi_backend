import * as bcrypt from 'bcrypt';
import { sequelize } from '../database';
import type { ChangePasswordInput } from '../interfaces/user.interface';
import { DailyBalance, Receipt, User } from '../models';
import { AppError } from '../utils/AppError';

const BCRYPT_SALT_ROUNDS = 12;

export async function changePassword(
  userId: number,
  input: ChangePasswordInput,
): Promise<void> {
  const user = await User.findByPk(userId);

  if (!user) {
    throw new AppError('User not found', 404);
  }

  const isCurrentPasswordValid = await bcrypt.compare(
    input.currentPassword,
    user.password,
  );

  if (!isCurrentPasswordValid) {
    throw new AppError('Current password is incorrect', 401);
  }

  const hashedPassword = await bcrypt.hash(input.newPassword, BCRYPT_SALT_ROUNDS);
  await user.update({ password: hashedPassword });
}

export async function deleteAccount(userId: number, password: string): Promise<void> {
  const user = await User.findByPk(userId);

  if (!user) {
    throw new AppError('User not found', 404);
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);

  if (!isPasswordValid) {
    throw new AppError('Password is incorrect', 401);
  }

  // Remove associated records (foreign keys `fk_user`) before deleting the
  // user so the operation does not violate PostgreSQL FK constraints.
  await sequelize.transaction(async (transaction) => {
    await Receipt.destroy({ where: { fk_user: userId }, transaction });
    await DailyBalance.destroy({ where: { fk_user: userId }, transaction });
    await user.destroy({ transaction });
  });
}
