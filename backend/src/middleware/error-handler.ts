import { Request, Response, NextFunction } from 'express';
import { AppError, ValidationError } from '../shared/errors';
import { sendError } from '../shared/api-response';
import { logger } from '../shared/logger';
import { ZodError } from 'zod';

export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction): void {
  const requestId = req.headers['x-request-id'] as string | undefined;

  if (err instanceof ZodError) {
    const errors: Record<string, string[]> = {};
    err.issues.forEach((issue) => {
      const field = issue.path.map(String).join('.');
      if (!errors[field]) errors[field] = [];
      errors[field].push(issue.message);
    });
    sendError(res, 422, 'VALIDATION_ERROR', 'Validation failed', errors);
    return;
  }

  if (err instanceof ValidationError) {
    sendError(res, err.statusCode, err.code, err.message, err.errors);
    return;
  }

  if (err instanceof AppError) {
    if (!err.isOperational) {
      logger.error(`Non-operational error: ${err.message}`, requestId, { stack: err.stack });
    }
    sendError(res, err.statusCode, err.code, err.message);
    return;
  }

  logger.error(`Unhandled error: ${err.message}`, requestId, { stack: err.stack });
  sendError(res, 500, 'INTERNAL_ERROR', 'An unexpected error occurred');
}

export function notFoundHandler(req: Request, res: Response): void {
  sendError(res, 404, 'NOT_FOUND', `Route ${req.method} ${req.path} not found`);
}
