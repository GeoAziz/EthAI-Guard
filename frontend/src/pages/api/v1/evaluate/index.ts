/**
 * POST /api/v1/evaluate - Evaluate model decision for bias/risk
 */

import { NextApiResponse } from 'next';
import { withAuth, AuthenticatedRequest, ApiResponse } from '@/lib/api-handler';
import { connectDB, getModels } from '@/lib/db-client';
import { v4 as uuidv4 } from 'uuid';

async function handler(req: AuthenticatedRequest, res: NextApiResponse<ApiResponse>) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      status: 'error',
      error: 'Method not allowed',
    });
  }

  try {
    const { user_id, model_id, input_features, context = {}, decision_timestamp } = req.body;

    if (!user_id || !model_id || !input_features) {
      return res.status(400).json({
        status: 'error',
        error: 'user_id, model_id, and input_features required',
      });
    }

    await connectDB();
    const { Evaluation } = getModels();

    const requestId = uuidv4();
    const augmentedContext = {
      ...context,
      user_id,
      model_id,
      decision_timestamp: decision_timestamp || new Date().toISOString(),
    };

    // TODO: Call AI Core simulation/evaluation engine
    // For MVP, return stub evaluation results
    const simulation = {
      model_id,
      prediction: Math.random() > 0.5 ? 'approve' : 'deny',
      confidence: Math.random() * 0.3 + 0.7, // 0.7-1.0
    };

    const rules = {
      passed: [],
      violated: [],
      warnings: [],
    };

    const risk = {
      score: Math.random() * 100,
      level: Math.random() > 0.7 ? 'high' : Math.random() > 0.4 ? 'medium' : 'low',
      factors: ['demographic_parity', 'equal_opportunity'],
    };

    const explanation = {
      en: `Model prediction: ${simulation.prediction} (${(simulation.confidence * 100).toFixed(1)}% confidence). Risk level: ${risk.level}.`,
    };

    // Store evaluation if model tracks it
    let storageId = null;
    try {
      const evalResult = await new Evaluation({
        request_id: requestId,
        user_id,
        model_id,
        input_features,
        simulation,
        rules,
        risk,
        explanation,
        context: augmentedContext,
        created_at: new Date(),
      }).save();
      storageId = evalResult._id;
    } catch (storageError) {
      // Non-blocking storage failure
      console.warn('Evaluation storage failed:', storageError);
    }

    const response = {
      request_id: requestId,
      timestamp: new Date().toISOString(),
      user_id,
      model_id,
      input_features,
      simulation,
      rules,
      risk,
      explanation,
      context: augmentedContext,
      ...(storageId && { storage_id: storageId.toString() }),
    };

    return res.status(200).json({
      status: 'success',
      data: response,
    });
  } catch (error: any) {
    console.error('Evaluation error:', error);
    return res.status(500).json({
      status: 'error',
      error: error.message,
    });
  }
}

export default withAuth(handler);
