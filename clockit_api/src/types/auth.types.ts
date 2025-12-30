import { Request } from 'express';

export interface DecodedToken {
  uid: string;
  email?: string;
  [key: string]: unknown;
}

export interface AuthenticatedRequest extends Request {
  user?: DecodedToken;
}
