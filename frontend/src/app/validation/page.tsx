'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import Link from 'next/link';

interface ValidationReport {
  firestore_id: string;
  report_id: string;
  model_name: string;
  model_version: string;
  status: 'pass' | 'conditional_pass' | 'fail';
  overall_score: number;
  confidence_score: number;
  total_cases: number;
  metrics_summary: {
    overall_fairness_score: number;
    num_critical: number;
    num_warnings: number;
    num_acceptable: number;
  };
  created_at: string;
}

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export default function ValidationListPage() {
  const [reports, setReports] = useState<ValidationReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [runningValidation, setRunningValidation] = useState(false);
  const [newValidation, setNewValidation] = useState({
    model_name: '',
    model_version: '1.0',
    num_synthetic_cases: 200,
  });

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token') || '';
      const res = await axios.get(`${BACKEND_URL}/v1/validation-reports`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setReports(res.data.reports);
      setError('');
    } catch (e: any) {
      setError(e.response?.data?.error || 'Failed to load validation reports');
      setReports([]);
    } finally {
      setLoading(false);
    }
  };

  const runValidation = async () => {
    if (!newValidation.model_name.trim()) {
      alert('Please enter a model name');
      return;
    }

    try {
      setRunningValidation(true);
      const token = localStorage.getItem('token') || '';
      await axios.post(
        `${BACKEND_URL}/v1/validate-model`,
        {
          model_name: newValidation.model_name,
          model_version: newValidation.model_version,
          num_synthetic_cases: newValidation.num_synthetic_cases,
          include_edge_cases: true,
          include_stability_test: true,
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      // Refresh list
      await fetchReports();
      
      // Reset form
      setNewValidation({
        model_name: '',
        model_version: '1.0',
        num_synthetic_cases: 200,
      });
      
      alert('Validation completed successfully!');
    } catch (e: any) {
      alert(e.response?.data?.detail || 'Validation failed');
    } finally {
      setRunningValidation(false);
    }
  };

  const getStatusColor = (status: string) => {
    if (status === 'pass') return 'bg-green-100 text-green-800 border-green-300';
    if (status === 'conditional_pass') return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    return 'bg-red-100 text-red-800 border-red-300';
  };

  const getStatusBadge = (status: string) => {
    const label = status.replace('_', ' ').toUpperCase();
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusColor(status)}`}>
        {label}
      </span>
    );
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            🛡️ Model Validation
          </h1>
          <p className="text-gray-600">
            Run synthetic fairness testing and review validation reports
          </p>
        </motion.div>

        {/* Run New Validation Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-lg shadow-lg p-6 mb-8"
        >
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Run New Validation
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Model Name
              </label>
              <input
                type="text"
                value={newValidation.model_name}
                onChange={(e) => setNewValidation({ ...newValidation, model_name: e.target.value })}
                placeholder="e.g., EthicalLoanDecisionAI"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={runningValidation}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Model Version
              </label>
              <input
                type="text"
                value={newValidation.model_version}
                onChange={(e) => setNewValidation({ ...newValidation, model_version: e.target.value })}
                placeholder="e.g., 1.0"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={runningValidation}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Synthetic Cases
              </label>
              <select
                value={newValidation.num_synthetic_cases}
                onChange={(e) => setNewValidation({ ...newValidation, num_synthetic_cases: parseInt(e.target.value) })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={runningValidation}
              >
                <option value="100">100 cases</option>
                <option value="200">200 cases</option>
                <option value="300">300 cases</option>
                <option value="500">500 cases</option>
              </select>
            </div>
          </div>
          <button
            onClick={runValidation}
            disabled={runningValidation}
            className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {runningValidation ? 'Running Validation...' : 'Run Validation'}
          </button>
        </motion.div>

        {/* Error Message */}
        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-red-50 border border-red-300 text-red-800 px-4 py-3 rounded-lg mb-6"
          >
            {error}
          </motion.div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="text-gray-600 mt-4">Loading validation reports...</p>
          </div>
        )}

        {/* Reports List */}
        {!loading && reports.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12 bg-white rounded-lg shadow"
          >
            <p className="text-gray-600 text-lg">No validation reports yet</p>
            <p className="text-gray-500 text-sm mt-2">Run your first validation to get started</p>
          </motion.div>
        )}

        {!loading && reports.length > 0 && (
          <div className="space-y-4">
            {reports.map((report, idx) => (
              <motion.div
                key={report.firestore_id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
              >
                <Link href={`/validation/${report.firestore_id}`}>
                  <div className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow cursor-pointer">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-xl font-bold text-gray-900">
                          {report.model_name} <span className="text-gray-500 text-sm font-normal">v{report.model_version}</span>
                        </h3>
                        <p className="text-sm text-gray-500 mt-1">
                          Report ID: {report.report_id}
                        </p>
                      </div>
                      {getStatusBadge(report.status)}
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-xs text-gray-500 mb-1">Fairness Score</p>
                        <p className={`text-2xl font-bold ${getScoreColor(report.overall_score)}`}>
                          {report.overall_score.toFixed(1)}
                        </p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-xs text-gray-500 mb-1">Confidence</p>
                        <p className="text-2xl font-bold text-gray-900">
                          {report.confidence_score.toFixed(1)}
                        </p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-xs text-gray-500 mb-1">Test Cases</p>
                        <p className="text-2xl font-bold text-gray-900">
                          {report.total_cases}
                        </p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-xs text-gray-500 mb-1">Issues</p>
                        <div className="flex items-center gap-2">
                          {report.metrics_summary.num_critical > 0 && (
                            <span className="text-red-600 font-bold text-sm">
                              {report.metrics_summary.num_critical} critical
                            </span>
                          )}
                          {report.metrics_summary.num_warnings > 0 && (
                            <span className="text-yellow-600 font-bold text-sm">
                              {report.metrics_summary.num_warnings} warnings
                            </span>
                          )}
                          {report.metrics_summary.num_critical === 0 && report.metrics_summary.num_warnings === 0 && (
                            <span className="text-green-600 font-bold text-sm">
                              ✓ None
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-between items-center text-sm text-gray-500">
                      <span>
                        {new Date(report.created_at).toLocaleString()}
                      </span>
                      <span className="text-blue-600 font-medium hover:underline">
                        View Full Report →
                      </span>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
