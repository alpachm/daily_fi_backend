import { type NextFunction, type Request, type Response } from 'express';
import { type ZodType } from 'zod';

type ValidationSource = 'body' | 'query' | 'params';

/**
 * Validates `req.body`, `req.query` or `req.params` against a Zod schema and
 * replaces the request data with the parsed (trimmed/lowercased/coerced) value
 * before the controller runs (see `agent.md` — "Sanitización Obligatoria").
 */
export const validate =
  (schema: ZodType, source: ValidationSource = 'body') =>
  (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[source]);

    if (!result.success) {
      next(result.error);
      return;
    }

    if (source === 'query') {
      // Express 5 exposes `req.query` as a read-only getter (no setter), so a
      // plain assignment would throw. Redefine it as an own, configurable data
      // property carrying the parsed value instead.
      Object.defineProperty(req, 'query', {
        value: result.data,
        configurable: true,
        enumerable: true,
        writable: true,
      });
    } else {
      (req as unknown as Record<string, unknown>)[source] = result.data;
    }

    next();
  };
