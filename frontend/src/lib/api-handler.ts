/**
 * Vercel API route handler wrapper
 * Provides:
 * - Firebase token verification
 * - CORS headers
 * - Error handling
 * - Type safety
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { verifyToken } from '@/lib/firebase-admin';

export interface AuthenticatedRequest extends NextApiRequest {
  user?: {
    uid: string;
    email: string;
    role: string;
    emailVerified: boolean;
  };
}

export interface ApiResponse<T = any> {
  status: 'success' | 'error';
  data?: T;
  error?: string;
  message?: string;
}

/**
 * Parse Authorization header and verify token
 */
export async function authenticateRequest(req: NextApiRequest): Promise<any> {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    throw new Error('No authentication token provided');
  }

  const user = await verifyToken(token);
  return user;
}

/**
 * Wrap API route handler with auth, CORS, error handling
 */
export function withAuth(
  handler: (req: AuthenticatedRequest, res: NextApiResponse) => Promise<void>
) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      res.status(200).end();
      return;
    }

    try {
      const user = await authenticateRequest(req);
      (req as AuthenticatedRequest).user = user;
      await handler(req as AuthenticatedRequest, res);
    } catch (error: any) {
      console.error('API Error:', error);
      const statusCode = error.message?.includes('Token verification failed') ? 401 : 500;
      res.status(statusCode).json({
        status: 'error',
        error: error.message || 'Internal server error',
      } as ApiResponse);
    }
  };
}

/**
 * Route handler without auth (public routes)
 */
export function withoutAuth(
  handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void>
) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      res.status(200).end();
      return;
    }

    try {
      await handler(req, res);
    } catch (error: any) {
      console.error('API Error:', error);
      res.status(500).json({
        status: 'error',
        error: error.message || 'Internal server error',
      } as ApiResponse);
    }
  };
}
