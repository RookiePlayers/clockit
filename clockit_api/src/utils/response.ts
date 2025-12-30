import { Response } from 'express';
import { HTTP_STATUS } from '@/config/constants';

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
  };
}

export const successResponse = <T>(
  res: Response,
  data: T,
  statusCode: number = HTTP_STATUS.OK,
  meta?: ApiResponse['meta']
): Response => {
  const response: ApiResponse<T> = {
    success: true,
    data,
  };

  if (meta) {
    response.meta = meta;
  }

  return res.status(statusCode).json(response);
};

export const errorResponse = (
  res: Response,
  statusCode: number,
  code: string,
  message: string,
  details?: unknown
): Response => {
  const response: ApiResponse = {
    success: false,
    error: {
      code,
      message,
      ...(details ? { details } : {}),
    },
  };

  return res.status(statusCode).json(response);
};

export const createdResponse = <T>(res: Response, data: T): Response => {
  return successResponse(res, data, HTTP_STATUS.CREATED);
};

export const noContentResponse = (res: Response): Response => {
  return res.status(HTTP_STATUS.NO_CONTENT).send();
};
