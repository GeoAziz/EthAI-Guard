/**
 * POST /api/v1/analyze - Run bias analysis on dataset
 * GET /api/v1/analyze/:id - Get analysis results
 */

import { NextApiResponse } from 'next';
import { withAuth, AuthenticatedRequest, ApiResponse } from '@/lib/api-handler';
import { connectDB, getModels } from '@/lib/db-client';

async function handler(req: AuthenticatedRequest, res: NextApiResponse<ApiResponse>) {
  const { id } = req.query;

  await connectDB();
  const { Dataset, Analysis } = getModels();

  if (req.method === 'POST') {
    try {
      const { datasetId } = req.body;

      if (!datasetId) {
        return res.status(400).json({
          status: 'error',
          error: 'datasetId required',
        });
      }

      // Verify dataset ownership
      const dataset = await Dataset.findById(datasetId);
      if (!dataset || dataset.owner !== req.user?.uid) {
        return res.status(403).json({
          status: 'error',
          error: 'Not authorized',
        });
      }

      // Create analysis record
      const analysis = await Analysis.create({
        dataset_id: datasetId,
        owner: req.user?.uid,
        status: 'running',
        results: {},
        created_at: new Date(),
      });

      // TODO: Call AI Core to run async analysis
      // For MVP, stub response - can integrate AI Core later
      // const aiResponse = await fetch(process.env.AI_CORE_URL, {
      //   method: 'POST',
      //   body: JSON.stringify({ dataset_id: datasetId })
      // });

      return res.status(201).json({
        status: 'success',
        data: analysis,
        message: 'Analysis started',
      });
    } catch (error: any) {
      return res.status(500).json({
        status: 'error',
        error: error.message,
      });
    }
  }

  if (req.method === 'GET') {
    try {
      if (!id || typeof id !== 'string') {
        return res.status(400).json({
          status: 'error',
          error: 'Analysis ID required',
        });
      }

      const analysis = await Analysis.findById(id).lean();

      if (!analysis) {
        return res.status(404).json({
          status: 'error',
          error: 'Analysis not found',
        });
      }

      // Check ownership
      if (analysis.owner !== req.user?.uid) {
        return res.status(403).json({
          status: 'error',
          error: 'Not authorized',
        });
      }

      return res.status(200).json({
        status: 'success',
        data: analysis,
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
