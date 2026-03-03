/**
 * GET /api/v1/access-requests - List access requests (admin only)
 * POST /api/v1/access-requests - Create access request
 */

import { NextApiResponse } from 'next';
import { withAuth, AuthenticatedRequest, ApiResponse } from '@/lib/api-handler';
import { connectDB, getModels } from '@/lib/db-client';

async function handler(req: AuthenticatedRequest, res: NextApiResponse<ApiResponse>) {
  await connectDB();
  const { AccessRequest } = getModels();

  if (req.method === 'GET') {
    try {
      // Only admins/reviewers can list all access requests
      if (req.user?.role !== 'admin' && req.user?.role !== 'reviewer') {
        return res.status(403).json({
          status: 'error',
          error: 'Not authorized',
        });
      }

      const requests = await AccessRequest.find().lean();

      return res.status(200).json({
        status: 'success',
        data: requests,
      });
    } catch (error: any) {
      return res.status(500).json({
        status: 'error',
        error: error.message,
      });
    }
  }

  if (req.method === 'POST') {
    try {
      const { dataset_id, access_level, reason } = req.body;

      if (!dataset_id || !access_level) {
        return res.status(400).json({
          status: 'error',
          error: 'dataset_id and access_level required',
        });
      }

      const request = await AccessRequest.create({
        requester_uid: req.user?.uid,
        dataset_id,
        access_level, // 'viewer', 'collaborator', 'admin'
        reason,
        status: 'pending',
        created_at: new Date(),
      });

      return res.status(201).json({
        status: 'success',
        data: request,
      });
    } catch (error: any) {
      return res.status(500).json({
        status: 'error',
        error: error.message,
      });
    }
  }

  return res.status(405).json({
    status: 'error',
    error: 'Method not allowed',
  });
}

export default withAuth(handler);
