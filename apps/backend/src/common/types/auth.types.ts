import { Request } from 'express';

export interface JwtPayload {
  id: string;
  email: string;
  role?: string;
  iat?: number;
  exp?: number;
}

export interface AuthenticatedRequest extends Request {
  user: JwtPayload;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  role?: string;
}
