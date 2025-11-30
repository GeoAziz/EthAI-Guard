'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import Link from 'next/link';

interface EvaluationSummary {
  evaluation_id: string;
  user_id: string;
  model_id: string;
  input_summary: Record<string, any>;
  risk_score: number;
  risk_level: 'low' | 'medium' | 'high';
  triggered_rules: string[];
  explanation_summary: string;
  timestamp: string;
}

interface Filters {
  risk_level: string;
  model_id: string;
  limit: number;
  offset: number;
}

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export default function HistoryPage() {
  const [evaluations, setEvaluations] = useState<EvaluationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState<Filters>({
    risk_level: '',
    model_id: '',
    limit: 20,
    offset: 0,
  });

  useEffect(() => {
    fetchEvaluations();
  }, [filters]);

  const fetchEvaluations = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.risk_level) {params.append('risk_level', filters.risk_level);}
      if (filters.model_id) {params.append('model_id', filters.model_id);}
      params.append('limit', filters.limit.toString());
      params.append('offset', filters.offset.toString());

      const token = localStorage.getItem('token') || '';
      const res = await axios.get(`${BACKEND_URL}/v1/evaluations?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setEvaluations(res.data.evaluations);
      setError('');
    } catch (e: any) {
      setError(e.response?.data?.error || 'Failed to load history');
      setEvaluations([]);
    } finally {
      setLoading(false);
    }
  };

  const getRiskColor = (level: string) => {
    if (level === 'high') {return 'bg-red-100 text-red-800 border-red-300';}
    if (level === 'medium') {return 'bg-yellow-100 text-yellow-800 border-yellow-300';}
    return 'bg-green-100 text-green-800 border-green-300';
  };

  const getRiskBadge = (level: string) => {
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-semibold border ${getRiskColor(level)}`}>
        {level.toUpperCase()}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-6xl mx-auto"
      >
        <h1 className="text-4xl font-bold text-gray-800 mb-2">Evaluation History</h1>
        <p className="text-gray-600 mb-6">Review past ethical evaluations and audit trail</p>

        {/* Filters Panel */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-lg shadow-md p-4 mb-6"
        >
          <h2 className="text-lg font-semibold text-gray-700 mb-3">Filters</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Risk Level</label>
              <select
                value={filters.risk_level}
                onChange={(e) => setFilters({ ...filters, risk_level: e.target.value, offset: 0 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Levels</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Model ID</label>
              <input
                type="text"
                value={filters.model_id}
                onChange={(e) => setFilters({ ...filters, model_id: e.target.value, offset: 0 })}
                placeholder="e.g., modelA"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Results per page</label>
              <select
                value={filters.limit}
                onChange={(e) => setFilters({ ...filters, limit: parseInt(e.target.value), offset: 0 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="10">10</option>
                <option value="20">20</option>
                <option value="50">50</option>
              </select>
            </div>
          </div>
        </motion.div>

        {/* Loading State */}
        {loading && (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.1 }}
                className="bg-white rounded-lg shadow-md p-4 animate-pulse"
              >
                <div className="h-6 bg-gray-200 rounded w-1/4 mb-2" />
                <div className="h-4 bg-gray-200 rounded w-3/4" />
              </motion.div>
            ))}
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700"
          >
            {error}
          </motion.div>
        )}

        {/* Empty State */}
        {!loading && !error && evaluations.length === 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            className="bg-white rounded-lg shadow-md p-12 text-center"
          >
            <div className="text-6xl mb-4">📊</div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No evaluations yet</h3>
            <p className="text-gray-500 mb-4">
              When you perform your first evaluation, history will appear here.
            </p>
            <Link
              href="/decision-analysis"
              className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
            >
              Run Evaluation
            </Link>
          </motion.div>
        )}

        {/* Evaluations List */}
        {!loading && !error && evaluations.length > 0 && (
          <div className="space-y-4">
            {evaluations.map((evaluation, index) => (
              <motion.div
                key={evaluation.evaluation_id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow"
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800">
                      Model: {evaluation.model_id}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {new Date(evaluation.timestamp).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold text-gray-700">{evaluation.risk_score}</span>
                    {getRiskBadge(evaluation.risk_level)}
                  </div>
                </div>
                <p className="text-gray-600 text-sm mb-3">
                  {evaluation.explanation_summary || 'No summary available'}
                </p>
                {evaluation.triggered_rules.length > 0 && (
                  <div className="mb-3">
                    <span className="text-xs font-medium text-gray-500 mr-2">Triggered Rules:</span>
                    {evaluation.triggered_rules.map((rule) => (
                      <span
                        key={rule}
                        className="inline-block bg-orange-100 text-orange-700 text-xs px-2 py-1 rounded mr-2"
                      >
                        {rule}
                      </span>
                    ))}
                  </div>
                )}
                <Link
                  href={`/history/${evaluation.evaluation_id}`}
                  className="inline-block bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition text-sm"
                >
                  View Details →
                </Link>
              </motion.div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {!loading && evaluations.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="flex justify-between items-center mt-6"
          >
            <button
              onClick={() => setFilters({ ...filters, offset: Math.max(0, filters.offset - filters.limit) })}
              disabled={filters.offset === 0}
              className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
            >
              ← Previous
            </button>
            <span className="text-gray-600 text-sm">
              Showing {filters.offset + 1} - {filters.offset + evaluations.length}
            </span>
            <button
              onClick={() => setFilters({ ...filters, offset: filters.offset + filters.limit })}
              disabled={evaluations.length < filters.limit}
              className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
            >
              Next →
            </button>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
