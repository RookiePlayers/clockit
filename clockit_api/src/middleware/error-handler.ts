import { Request, Response, NextFunction } from 'express';
import { AppError } from '@/utils/errors';
import { errorResponse } from '@/utils/response';
import { logger } from '@/utils/logger';
import { HTTP_STATUS, ERROR_CODES } from '@/config/constants';
import { config } from '@/config/env';

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (res.headersSent) {
    return next(err);
  }

  if (err instanceof AppError) {
    logger.warn('Application error', {
      code: err.code,
      message: err.message,
      statusCode: err.statusCode,
      path: req.path,
    });

    errorResponse(res, err.statusCode, err.code, err.message);
    return;
  }

  logger.error('Unhandled error', {
    error: err,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  const message = config.isDevelopment
    ? err.message
    : 'An unexpected error occurred';

  const details = config.isDevelopment ? { stack: err.stack } : undefined;

  errorResponse(
    res,
    HTTP_STATUS.INTERNAL_SERVER_ERROR,
    ERROR_CODES.INTERNAL_ERROR,
    message,
    details
  );
};

export const notFoundHandler = (
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  errorResponse(
    res,
    HTTP_STATUS.NOT_FOUND,
    ERROR_CODES.NOT_FOUND,
    `Route ${req.method} ${req.path} not found`
  );
};
