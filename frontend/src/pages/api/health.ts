/**
 * GET /api/health
 * Health check endpoint (public)
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { withoutAuth, ApiResponse } from '@/lib/api-handler';

async function handler(req: NextApiRequest, res: NextApiResponse<ApiResponse>) {
  if (req.method !== 'GET') {
    return res.status(405).json({ status: 'error', error: 'Method not allowed' });
  }

  res.status(200).json({
    status: 'success',
    data: {
      service: 'ethixai-backend',
      environment: process.env.NODE_ENV,
      timestamp: new Date().toISOString(),
    },
  });
}

export default withoutAuth(handler);
