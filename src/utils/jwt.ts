import * as jwt from 'jsonwebtoken';

const DEFAULT_EXPIRES_IN = '7d';

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error(
      'Missing JWT_SECRET environment variable. Add it to your `.env` file before starting the server.',
    );
  }

  return secret;
}

export interface AccessTokenPayload extends jwt.JwtPayload {
  sub: string;
  email: string;
  token_version: number;
}

export function signAccessToken(payload: {
  sub: string;
  email: string;
  token_version: number;
}): string {
  const expiresIn = (process.env.JWT_EXPIRES_IN ??
    DEFAULT_EXPIRES_IN) as jwt.SignOptions['expiresIn'];

  return jwt.sign(payload, getJwtSecret(), { expiresIn });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  const decoded = jwt.verify(token, getJwtSecret());

  if (typeof decoded === 'string') {
    throw new Error('Unexpected JWT payload shape');
  }

  return decoded as AccessTokenPayload;
}
