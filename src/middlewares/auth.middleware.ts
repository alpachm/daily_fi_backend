import { type NextFunction, type Request, type Response } from 'express';
import { User } from '../models';
import { AppError } from '../utils/AppError';
import { verifyAccessToken } from '../utils/jwt';

/**
 * Requires a valid `Authorization: Bearer <token>` header, resolves the token's
 * `sub` claim to a persisted user and attaches it to `req.user`.
 */
export const requireAuth = async (
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authorization = req.headers.authorization;

    if (!authorization || !authorization.startsWith('Bearer ')) {
      next(new AppError('Authentication required. Provide a valid Bearer token.', 401));
      return;
    }

    const token = authorization.slice('Bearer '.length).trim();

    let payload;
    try {
      payload = verifyAccessToken(token);
    } catch {
      next(new AppError('Invalid or expired token.', 401));
      return;
    }

    const pk_user = Number(payload.sub);

    if (!Number.isInteger(pk_user)) {
      next(new AppError('Invalid token.', 401));
      return;
    }

    const user = await User.findByPk(pk_user);

    if (!user) {
      next(new AppError('User no longer exists.', 401));
      return;
    }

    // Token Versioning: reject tokens whose version no longer matches the one
    // persisted for the user (e.g. after a logout revoked every prior token).
    if (payload.token_version !== user.token_version) {
      next(new AppError('Token has been revoked. Please log in again.', 401));
      return;
    }

    req.user = { pk_user: user.pk_user, email: user.email };
    next();
  } catch (err) {
    next(err);
  }
};
