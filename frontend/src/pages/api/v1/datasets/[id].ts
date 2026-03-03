/**
 * GET /api/v1/datasets/[id] - Get dataset details
 * DELETE /api/v1/datasets/[id] - Delete dataset
 */

import { NextApiResponse } from 'next';
import { withAuth, AuthenticatedRequest, ApiResponse } from '@/lib/api-handler';
import { connectDB, getModels } from '@/lib/db-client';
import { Types } from 'mongoose';

async function handler(req: AuthenticatedRequest, res: NextApiResponse<ApiResponse>) {
  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({
      status: 'error',
      error: 'Dataset ID required',
    });
  }

  await connectDB();
  const { Dataset } = getModels();

  if (req.method === 'GET') {
    try {
      const dataset = await Dataset.findById(id).lean();

      if (!dataset) {
        return res.status(404).json({
          status: 'error',
          error: 'Dataset not found',
        });
      }

      // Check ownership
      if (dataset.owner !== req.user?.uid) {
        return res.status(403).json({
          status: 'error',
          error: 'Not authorized',
        });
      }

      return res.status(200).json({
        status: 'success',
        data: dataset,
      });
    } catch (error: any) {
      return res.status(500).json({
        status: 'error',
        error: error.message,
      });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const dataset = await Dataset.findById(id);

      if (!dataset) {
        return res.status(404).json({
          status: 'error',
          error: 'Dataset not found',
        });
      }

      // Check ownership
      if (dataset.owner !== req.user?.uid) {
        return res.status(403).json({
          status: 'error',
          error: 'Not authorized',
        });
      }

      await Dataset.deleteOne({ _id: id });

      return res.status(200).json({
        status: 'success',
        message: 'Dataset deleted',
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
