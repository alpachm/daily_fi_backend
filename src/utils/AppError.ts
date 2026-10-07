/**
 * Operational error carrying a clean, client-safe message and an HTTP status
 * code. Used across services and controllers so internal details (stack traces,
 * SQL errors) never reach the API consumer (see `agent.md` — "Respuestas de
 * Error"). An optional `errors` array adds field-level details for responses
 * that need them (e.g. a missing related record).
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly errors?: Array<{ field: string; message: string }>;

  constructor(
    message: string,
    statusCode: number,
    errors?: Array<{ field: string; message: string }>,
  ) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.isOperational = true;
    this.errors = errors;

    Error.captureStackTrace(this, this.constructor);
  }
}
