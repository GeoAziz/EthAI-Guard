/**
 * GET /api/v1/datasets - List user's datasets
 * POST /api/v1/datasets - Create dataset
 */

import { NextApiResponse } from 'next';
import { withAuth, AuthenticatedRequest, ApiResponse } from '@/lib/api-handler';
import { connectDB, getModels } from '@/lib/db-client';

async function handler(req: AuthenticatedRequest, res: NextApiResponse<ApiResponse>) {
  await connectDB();
  const { Dataset } = getModels();

  if (req.method === 'GET') {
    try {
      const datasets = await Dataset.find({ owner: req.user?.uid }).lean();
      return res.status(200).json({
        status: 'success',
        data: datasets,
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
      const { name, columns, rows_count } = req.body;

      if (!name) {
        return res.status(400).json({
          status: 'error',
          error: 'Dataset name required',
        });
      }

      const dataset = await Dataset.create({
        name,
        owner: req.user?.uid,
        columns: columns || [],
        rows_count: rows_count || 0,
      });

      return res.status(201).json({
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

  return res.status(405).json({
    status: 'error',
    error: 'Method not allowed',
  });
}

export default withAuth(handler);
