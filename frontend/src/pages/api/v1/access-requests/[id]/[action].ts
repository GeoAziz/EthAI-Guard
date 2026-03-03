/**
 * POST /api/v1/access-requests/[id]/approve - Approve access request
 * POST /api/v1/access-requests/[id]/reject - Reject access request
 */

import { NextApiResponse } from 'next';
import { withAuth, AuthenticatedRequest, ApiResponse } from '@/lib/api-handler';
import { connectDB, getModels } from '@/lib/db-client';
import { setUserRole } from '@/lib/firebase-admin';

async function handler(req: AuthenticatedRequest, res: NextApiResponse<ApiResponse>) {
  const { id, action } = req.query;

  // Only admins/reviewers can approve/reject
  if (req.user?.role !== 'admin' && req.user?.role !== 'reviewer') {
    return res.status(403).json({
      status: 'error',
      error: 'Not authorized',
    });
  }

  if (!id || typeof id !== 'string') {
    return res.status(400).json({
      status: 'error',
      error: 'Request ID required',
    });
  }

  await connectDB();
  const { AccessRequest } = getModels();

  if (req.method !== 'POST') {
    return res.status(405).json({
      status: 'error',
      error: 'Method not allowed',
    });
  }

  try {
    const accessRequest = await AccessRequest.findById(id);

    if (!accessRequest) {
      return res.status(404).json({
        status: 'error',
        error: 'Access request not found',
      });
    }

    if (action === 'approve') {
      accessRequest.status = 'approved';
      accessRequest.reviewed_by = req.user?.uid;
      accessRequest.reviewed_at = new Date();

      await accessRequest.save();

      // Update user's role in Firebase custom claims
      try {
        await setUserRole(accessRequest.requester_uid, accessRequest.access_level);
      } catch (firebaseError: any) {
        console.error('Firebase role update failed:', firebaseError);
        // Request approved in DB but Firebase role update failed - notify but don't fail
      }

      return res.status(200).json({
        status: 'success',
        message: 'Access request approved',
        data: accessRequest,
      });
    }

    if (action === 'reject') {
      accessRequest.status = 'rejected';
      accessRequest.reviewed_by = req.user?.uid;
      accessRequest.reviewed_at = new Date();
      accessRequest.rejection_reason = req.body.reason;

      await accessRequest.save();

      return res.status(200).json({
        status: 'success',
        message: 'Access request rejected',
        data: accessRequest,
      });
    }

    return res.status(400).json({
      status: 'error',
      error: 'Invalid action',
    });
  } catch (error: any) {
    return res.status(500).json({
      status: 'error',
      error: error.message,
    });
  }
}

export default withAuth(handler);
