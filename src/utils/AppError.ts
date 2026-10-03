/**
 * Operational error carrying a clean, client-safe message and an HTTP status
 * code. Used across services and controllers so internal details (stack traces,
 * SQL errors) never reach the API consumer (see `agent.md` — "Respuestas de
 * Error").
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}
