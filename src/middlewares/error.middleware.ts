import { type NextFunction, type Request, type Response } from 'express';
import multer from 'multer';
import { UniqueConstraintError } from 'sequelize';
import { ZodError } from 'zod';

import { AppError } from '../utils/AppError';
import { MAX_RECEIPT_FILE_COUNT, MAX_RECEIPT_FILE_SIZE } from './upload';

const MAX_FILE_SIZE_MB = MAX_RECEIPT_FILE_SIZE / (1024 * 1024);

/**
 * Centralized Express error handler. Converts every known error type into a
 * client-safe `{ status: 'fail', message }` response (see `agent.md` —
 * "Respuestas de Error") and never leaks stack traces or internals.
 */
export const errorHandler = (
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  // Multer upload failures (wrong field name, too many files, oversized file).
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_UNEXPECTED_FILE' || err.code === 'LIMIT_FILE_COUNT') {
      res.status(400).json({
        status: 'fail',
        message: `Maximum upload limit exceeded. You can upload up to ${MAX_RECEIPT_FILE_COUNT} files per request.`,
      });
      return;
    }

    if (err.code === 'LIMIT_FILE_SIZE') {
      res.status(400).json({
        status: 'fail',
        message: `File too large. Each file must be ${MAX_FILE_SIZE_MB} MB or smaller.`,
      });
      return;
    }

    res.status(400).json({ status: 'fail', message: 'File upload failed.' });
    return;
  }

  // Zod validation failures -> 400 with field-level details.
  if (err instanceof ZodError) {
    const errors = err.issues.map((issue) => ({
      field: issue.path.join('.') || 'body',
      message: issue.message,
    }));

    res.status(400).json({
      status: 'fail',
      message: 'Validation failed',
      errors,
    });
    return;
  }

  // Malformed JSON body (raised by express.json).
  if (err instanceof SyntaxError) {
    const parseError = err as SyntaxError & { type?: string };
    if (parseError.type === 'entity.parse.failed') {
      res.status(400).json({ status: 'fail', message: 'Invalid JSON payload' });
      return;
    }
  }

  // Database unique constraint (e.g. duplicate email race condition).
  if (err instanceof UniqueConstraintError) {
    res.status(409).json({ status: 'fail', message: 'Resource already exists' });
    return;
  }

  // Operational errors with a safe message and explicit status code.
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ status: 'fail', message: err.message });
    return;
  }

  // Unknown error: log server-side, send a sanitized response to the client.
  console.error('[Unhandled Error]', err);
  res.status(500).json({ status: 'fail', message: 'Internal server error' });
};
