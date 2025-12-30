import rateLimit from 'express-rate-limit';
import { config } from '@/config/env';
import { errorResponse } from '@/utils/response';
import { HTTP_STATUS, ERROR_CODES } from '@/config/constants';

export const createRateLimiter = (windowMs?: number, max?: number) => {
  return rateLimit({
    windowMs: windowMs || config.rateLimit.windowMs,
    max: max || config.rateLimit.maxRequests,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      void req; // Unused but required by express-rate-limit
      errorResponse(
        res,
        HTTP_STATUS.TOO_MANY_REQUESTS,
        ERROR_CODES.RATE_LIMIT_EXCEEDED,
        'Too many requests, please try again later'
      );
    },
  });
};

// Default rate limiter for general API endpoints (15 min window, 300 requests)
export const defaultRateLimiter = createRateLimiter(15 * 60 * 1000, 300);

// Strict rate limiter for sensitive operations (1 min window, 10 requests)
export const strictRateLimiter = createRateLimiter(60 * 1000, 10);

// Auth rate limiter for login/signup (15 min window, 5 requests)
export const authRateLimiter = createRateLimiter(15 * 60 * 1000, 5);
