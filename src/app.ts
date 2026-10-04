import compression from 'compression';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import dotenv from 'dotenv';
import express, { type Express, type Request, type Response } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import hpp from 'hpp';

import { errorHandler } from './middlewares/error.middleware';
import apiRoutes from './routes/index';

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

app.use(errorHandler);

export default app;
