'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';

interface EvaluationDetail {
  evaluation_id: string;
  user_id: string;
  model_id: string;
  risk_score: number;
  risk_level: 'low' | 'medium' | 'high';
  triggered_rules: string[];
  explanation: {
    summary: string;
    details: string[];
    recommended_action: string;
  };
  full_simulation: any;
  full_rules: any;
  full_risk: any;
  input_features: Record<string, any>;
  context: Record<string, any>;
  timestamp: string;
  request_id: string;
}

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export default function EvaluationDetailPage({ params }: { params: { id: string } }) {
  const [evaluation, setEvaluation] = useState<EvaluationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [jsonExpanded, setJsonExpanded] = useState<Record<string, boolean>>({});
  const router = useRouter();

  useEffect(() => {
    fetchEvaluation();
  }, [params.id]);

  const fetchEvaluation = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token') || '';
      const res = await axios.get(`${BACKEND_URL}/v1/evaluations/${params.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setEvaluation(res.data);
      setError('');
    } catch (e: any) {
      setError(e.response?.data?.error || 'Failed to load evaluation');
    } finally {
      setLoading(false);
    }
  };

  const getRiskColor = (level: string) => {
    if (level === 'high') return 'bg-red-100 text-red-800 border-red-300';
    if (level === 'medium') return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    return 'bg-green-100 text-green-800 border-green-300';
  };

  const toggleJson = (key: string) => {
    setJsonExpanded({ ...jsonExpanded, [key]: !jsonExpanded[key] });
  };

  const handleReEvaluate = () => {
    if (evaluation) {
      // Navigate to decision-analysis with pre-filled inputs
      const query = new URLSearchParams({
        model_id: evaluation.model_id,
        input_features: JSON.stringify(evaluation.input_features)
      });
      router.push(`/decision-analysis?${query.toString()}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading evaluation details...</p>
        </motion.div>
      </div>
    );
  }

  if (error || !evaluation) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="max-w-4xl mx-auto bg-red-50 border border-red-200 rounded-lg p-6 text-red-700"
        >
          <h2 className="text-xl font-semibold mb-2">Error</h2>
          <p>{error || 'Evaluation not found'}</p>
          <button
            onClick={() => router.push('/history')}
            className="mt-4 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition"
          >
            ← Back to History
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-5xl mx-auto"
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-4xl font-bold text-gray-800">Evaluation Details</h1>
            <p className="text-gray-600 text-sm mt-1">
              {new Date(evaluation.timestamp).toLocaleString()} · Request ID: {evaluation.request_id}
            </p>
          </div>
          <button
            onClick={() => router.push('/history')}
            className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition"
          >
            ← Back
          </button>
        </div>

        {/* 1. Evaluation Summary Card */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-lg shadow-md p-6 mb-6"
        >
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">🎯 Evaluation Summary</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-500">Model Used</p>
              <p className="text-lg font-semibold text-gray-800">{evaluation.model_id}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Risk Score</p>
              <p className="text-3xl font-bold text-gray-800">{evaluation.risk_score}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Compliance Level</p>
              <span
                className={`inline-block px-3 py-1 rounded-full text-sm font-semibold border ${getRiskColor(
                  evaluation.risk_level
                )}`}
              >
                {evaluation.risk_level.toUpperCase()}
              </span>
            </div>
          </div>
        </motion.div>

        {/* 2. Triggered Rules Panel */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-lg shadow-md p-6 mb-6"
        >
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">📌 Triggered Rules</h2>
          {evaluation.triggered_rules.length === 0 ? (
            <p className="text-gray-500 italic">No rules triggered - evaluation passed all checks</p>
          ) : (
            <div className="space-y-3">
              {evaluation.triggered_rules.map((rule, idx) => (
                <motion.div
                  key={rule}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * idx }}
                  className="bg-orange-50 border border-orange-200 rounded-md p-4"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-orange-800">{rule}</h3>
                      <p className="text-sm text-orange-600 mt-1">
                        {getRuleExplanation(rule, evaluation.full_rules)}
                      </p>
                    </div>
                    <span className="bg-orange-200 text-orange-900 text-xs px-2 py-1 rounded font-semibold">
                      TRIGGERED
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>

        {/* 3. Explanation Narrative */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-lg shadow-md p-6 mb-6"
        >
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">🔎 Explanation Narrative</h2>
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-1">Summary</h3>
              <p className="text-gray-800">{evaluation.explanation.summary}</p>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Key Factors</h3>
              <ul className="list-disc list-inside space-y-1">
                {evaluation.explanation.details.map((detail, idx) => (
                  <li key={idx} className="text-gray-700">
                    {detail}
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <h3 className="text-sm font-semibold text-blue-800 uppercase tracking-wide mb-1">
                Recommended Action
              </h3>
              <p className="text-blue-700">{evaluation.explanation.recommended_action}</p>
            </div>
          </div>
        </motion.div>

        {/* 4. Input & Output JSON Viewer */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-lg shadow-md p-6 mb-6"
        >
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">🧪 Technical Details</h2>
          <div className="space-y-4">
            {/* Input Features */}
            <div>
              <button
                onClick={() => toggleJson('input_features')}
                className="w-full text-left bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-md font-semibold text-gray-800 transition"
              >
                {jsonExpanded['input_features'] ? '▼' : '▶'} Input Features
              </button>
              {jsonExpanded['input_features'] && (
                <motion.pre
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mt-2 bg-gray-50 p-4 rounded-md text-sm text-gray-700 overflow-x-auto border border-gray-200"
                >
                  {JSON.stringify(evaluation.input_features, null, 2)}
                </motion.pre>
              )}
            </div>

            {/* Simulation Output */}
            <div>
              <button
                onClick={() => toggleJson('simulation')}
                className="w-full text-left bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-md font-semibold text-gray-800 transition"
              >
                {jsonExpanded['simulation'] ? '▼' : '▶'} Simulation Output
              </button>
              {jsonExpanded['simulation'] && (
                <motion.pre
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mt-2 bg-gray-50 p-4 rounded-md text-sm text-gray-700 overflow-x-auto border border-gray-200"
                >
                  {JSON.stringify(evaluation.full_simulation, null, 2)}
                </motion.pre>
              )}
            </div>

            {/* Rules Output */}
            <div>
              <button
                onClick={() => toggleJson('rules')}
                className="w-full text-left bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-md font-semibold text-gray-800 transition"
              >
                {jsonExpanded['rules'] ? '▼' : '▶'} Rules Evaluation
              </button>
              {jsonExpanded['rules'] && (
                <motion.pre
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mt-2 bg-gray-50 p-4 rounded-md text-sm text-gray-700 overflow-x-auto border border-gray-200"
                >
                  {JSON.stringify(evaluation.full_rules, null, 2)}
                </motion.pre>
              )}
            </div>

            {/* Risk Output */}
            <div>
              <button
                onClick={() => toggleJson('risk')}
                className="w-full text-left bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-md font-semibold text-gray-800 transition"
              >
                {jsonExpanded['risk'] ? '▼' : '▶'} Risk Analysis
              </button>
              {jsonExpanded['risk'] && (
                <motion.pre
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mt-2 bg-gray-50 p-4 rounded-md text-sm text-gray-700 overflow-x-auto border border-gray-200"
                >
                  {JSON.stringify(evaluation.full_risk, null, 2)}
                </motion.pre>
              )}
            </div>
          </div>
        </motion.div>

        {/* 5. Re-Evaluate Button */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="bg-white rounded-lg shadow-md p-6 text-center"
        >
          <h2 className="text-xl font-semibold text-gray-800 mb-2">🔁 Re-run Evaluation</h2>
          <p className="text-gray-600 mb-4">
            Run this evaluation again with the same inputs to see current results
          </p>
          <button
            onClick={handleReEvaluate}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition font-semibold"
          >
            Re-Evaluate with Same Inputs →
          </button>
        </motion.div>
      </motion.div>
    </div>
  );
}

// Helper function to generate rule explanations
function getRuleExplanation(ruleName: string, fullRules: any): string {
  if (ruleName === 'fairness_imbalance') {
    const details = fullRules?.fairness;
    return `Sensitive attribute distribution exceeded threshold. Imbalance ratio: ${
      details?.max_group_ratio?.toFixed(2) || 'N/A'
    }`;
  }
  if (ruleName === 'extreme_output_bias') {
    const details = fullRules?.bias;
    return `Model output was extreme (${details?.model_output || 'N/A'}), exceeding bias threshold of 90.`;
  }
  if (ruleName === 'compliance_missing_fields') {
    const details = fullRules?.compliance;
    return `Missing required metadata fields: ${details?.missing_fields?.join(', ') || 'unknown'}`;
  }
  return 'Rule triggered during evaluation.';
}
