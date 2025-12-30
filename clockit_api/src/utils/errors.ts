import { HTTP_STATUS, ERROR_CODES } from '@/config/constants';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public isOperational = true
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, public details?: unknown) {
    super(
      HTTP_STATUS.BAD_REQUEST,
      ERROR_CODES.VALIDATION_ERROR,
      message
    );
  }
}

export class AuthenticationError extends AppError {
  constructor(message = 'Authentication failed') {
    super(
      HTTP_STATUS.UNAUTHORIZED,
      ERROR_CODES.AUTHENTICATION_ERROR,
      message
    );
  }
}

export class AuthorizationError extends AppError {
  constructor(message = 'Access denied') {
    super(
      HTTP_STATUS.FORBIDDEN,
      ERROR_CODES.AUTHORIZATION_ERROR,
      message
    );
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(
      HTTP_STATUS.NOT_FOUND,
      ERROR_CODES.NOT_FOUND,
      `${resource} not found`
    );
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(
      HTTP_STATUS.CONFLICT,
      ERROR_CODES.CONFLICT,
      message
    );
  }
}

export class RateLimitError extends AppError {
  constructor(message = 'Too many requests') {
    super(
      HTTP_STATUS.TOO_MANY_REQUESTS,
      ERROR_CODES.RATE_LIMIT_EXCEEDED,
      message
    );
  }
}
