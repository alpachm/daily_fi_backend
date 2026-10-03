import compression from 'compression';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import dotenv from 'dotenv';
import express, { type Express, type NextFunction, type Request, type Response } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import hpp from 'hpp';
import { UniqueConstraintError } from 'sequelize';
import { ZodError } from 'zod';

import apiRoutes from './routes/index';
import { AppError } from './utils/AppError';

// Load environment variables from `.env` into `process.env`.
dotenv.config();

const app: Express = express();

// ---------------------------------------------------------------------------
// Security middleware
// ---------------------------------------------------------------------------

// Set a variety of HTTP security headers.
app.use(helmet());

// Enable Cross-Origin Resource Sharing.
app.use(cors());

// Protect against HTTP Parameter Pollution attacks.
app.use(hpp());

// Compress all responses.
app.use(compression());

// Parse cookies.
app.use(cookieParser());

// ---------------------------------------------------------------------------
// Body parsing
// ---------------------------------------------------------------------------

app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// ---------------------------------------------------------------------------
// Rate limiting
// ---------------------------------------------------------------------------

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 100, // Limit each IP to 100 requests per window
  standardHeaders: 'draft-8',
  legacyHeaders: false,
});

// Apply the rate limiter to every request under `/api`.
app.use('/api', limiter);

// ---------------------------------------------------------------------------
// Health check
// ---------------------------------------------------------------------------

app.get('/api/v1/health', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'ok' });
});

// ---------------------------------------------------------------------------
// API routes (versioned under /api/v1)
// ---------------------------------------------------------------------------

app.use('/api/v1', apiRoutes);

// ---------------------------------------------------------------------------
// 404 handler
// ---------------------------------------------------------------------------

app.use((_req: Request, res: Response) => {
  res.status(404).json({ status: 'fail', message: 'Route not found' });
});

// ---------------------------------------------------------------------------
// Global error handler
// ---------------------------------------------------------------------------

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
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
});

export default app;
