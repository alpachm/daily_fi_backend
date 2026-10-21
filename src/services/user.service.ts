import { createHash, randomBytes } from 'node:crypto';
import * as bcrypt from 'bcrypt';
import { Op } from 'sequelize';
import { sequelize } from '../database';
import type {
  ChangePasswordInput,
  ForgotPasswordInput,
  ResetPasswordInput,
} from '../interfaces/user.interface';
import { DailyBalance, Receipt, User } from '../models';
import { AppError } from '../utils/AppError';
import { sendPasswordResetEmail } from '../utils/email';

const BCRYPT_SALT_ROUNDS = 12;
const PASSWORD_RESET_TOKEN_TTL_MS = 15 * 60 * 1000;

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

  const isSameAsCurrentPassword = await bcrypt.compare(
    input.newPassword,
    user.password,
  );

  if (isSameAsCurrentPassword) {
    throw new AppError('Validation failed', 400, [
      {
        field: 'newPassword',
        message: 'New password cannot be the same as the current password',
      },
    ]);
  }

  const hashedPassword = await bcrypt.hash(input.newPassword, BCRYPT_SALT_ROUNDS);
  await user.update({ password: hashedPassword });
}

/**
 * Hashes a plain-text reset token with SHA-256 so only the digest is persisted.
 */
function hashResetToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * Resolves and normalizes the frontend base URL used to build reset links.
 */
function getFrontendUrl(): string {
  const frontendUrl = process.env.FRONTEND_URL;

  if (!frontendUrl) {
    throw new Error(
      'Missing FRONTEND_URL environment variable. Add it to your `.env` file before using password reset.',
    );
  }

  return frontendUrl.replace(/\/+$/, '');
}

export async function requestPasswordReset(
  input: ForgotPasswordInput,
): Promise<void> {
  const user = await User.findOne({ where: { email: input.email } });

  // User enumeration protection: never reveal whether the email exists.
  if (!user) {
    return;
  }

  const resetToken = randomBytes(32).toString('hex');
  const hashedToken = hashResetToken(resetToken);
  const expiresAt = new Date(Date.now() + PASSWORD_RESET_TOKEN_TTL_MS);

  await user.update({
    password_reset_token: hashedToken,
    password_reset_expires_at: expiresAt,
  });

  const resetLink = `${getFrontendUrl()}/reset-password?token=${encodeURIComponent(resetToken)}`;

  try {
    await sendPasswordResetEmail(user.email, resetLink);
  } catch (err) {
    console.error('[Password Reset] Failed to send reset email:', err);
    throw new AppError(
      'Failed to send password reset email. Please try again later.',
      500,
    );
  }
}

export async function resetUserPassword(input: ResetPasswordInput): Promise<void> {
  const hashedToken = hashResetToken(input.token);

  const user = await User.findOne({
    where: {
      password_reset_token: hashedToken,
      password_reset_expires_at: { [Op.gt]: new Date() },
    },
  });

  if (!user) {
    throw new AppError('Invalid or expired reset token', 400);
  }

  const hashedPassword = await bcrypt.hash(input.newPassword, BCRYPT_SALT_ROUNDS);

  await user.update({
    password: hashedPassword,
    password_reset_token: null,
    password_reset_expires_at: null,
  });
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
