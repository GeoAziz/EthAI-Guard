'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { use } from 'react';

interface MetricDetail {
  metric: string;
  score: number;
  level: 'acceptable' | 'warning' | 'critical';
  explanation: string;
  details: Record<string, any>;
}

interface ValidationReportFull {
  firestore_id: string;
  user_id: string;
  model_name: string;
  model_version: string;
  report_id: string;
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
  recommendations: string[];
  report_json: {
    report_id: string;
    timestamp: string;
    model_metadata: Record<string, any>;
    synthetic_dataset: Record<string, any>;
    validation_summary: Record<string, any>;
    fairness_metrics: {
      overall_score: number;
      metrics: MetricDetail[];
    };
    status: string;
    status_reason: string;
    recommendations: string[];
    confidence_score: number;
  };
  created_at: string;
}

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export default function ValidationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const [report, setReport] = useState<ValidationReportFull | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    metrics: true,
    recommendations: true,
    dataset: false,
    rawJson: false,
  });

  useEffect(() => {
    fetchReport();
  }, [resolvedParams.id]);

  const fetchReport = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token') || '';
      const res = await axios.get(`${BACKEND_URL}/v1/validation-reports/${resolvedParams.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setReport(res.data);
      setError('');
    } catch (e: any) {
      setError(e.response?.data?.error || 'Failed to load validation report');
      setReport(null);
    } finally {
      setLoading(false);
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const exportJSON = () => {
    if (!report) return;
    const dataStr = JSON.stringify(report.report_json, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const exportFileDefaultName = `validation-report-${report.report_id}.json`;
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const getStatusColor = (status: string) => {
    if (status === 'pass') return 'bg-green-100 text-green-800 border-green-300';
    if (status === 'conditional_pass') return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    return 'bg-red-100 text-red-800 border-red-300';
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getLevelColor = (level: string) => {
    if (level === 'acceptable') return 'bg-green-100 text-green-800';
    if (level === 'warning') return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const getLevelIcon = (level: string) => {
    if (level === 'acceptable') return '✓';
    if (level === 'warning') return '⚠';
    return '✗';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="text-gray-600 mt-4">Loading validation report...</p>
        </div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 border border-red-300 text-red-800 px-4 py-3 rounded-lg">
            {error || 'Report not found'}
          </div>
          <Link href="/validation" className="text-blue-600 hover:underline mt-4 inline-block">
            ← Back to Validation Reports
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <Link href="/validation" className="text-blue-600 hover:underline mb-4 inline-block">
            ← Back to Validation Reports
          </Link>
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">
                {report.model_name} <span className="text-gray-500 text-2xl">v{report.model_version}</span>
              </h1>
              <p className="text-gray-600">Validation Report</p>
              <p className="text-sm text-gray-500 mt-1">
                Generated: {new Date(report.created_at).toLocaleString()}
              </p>
            </div>
            <button
              onClick={exportJSON}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Export JSON
            </button>
          </div>
        </motion.div>

        {/* Status Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-lg shadow-lg p-6 mb-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900">Overall Status</h2>
            <span className={`px-4 py-2 rounded-full text-sm font-bold border ${getStatusColor(report.status)}`}>
              {report.status.replace('_', ' ').toUpperCase()}
            </span>
          </div>
          <p className="text-gray-700 mb-6">{report.report_json.status_reason}</p>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
              <p className="text-xs text-blue-700 mb-1 font-medium">Fairness Score</p>
              <p className={`text-3xl font-bold ${getScoreColor(report.overall_score)}`}>
                {report.overall_score.toFixed(1)}<span className="text-lg">/100</span>
              </p>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
              <p className="text-xs text-purple-700 mb-1 font-medium">Confidence Score</p>
              <p className="text-3xl font-bold text-gray-900">
                {report.confidence_score.toFixed(1)}<span className="text-lg">/100</span>
              </p>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
              <p className="text-xs text-green-700 mb-1 font-medium">Test Cases</p>
              <p className="text-3xl font-bold text-gray-900">{report.total_cases}</p>
            </div>
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-4 border border-gray-200">
              <p className="text-xs text-gray-700 mb-1 font-medium">Status</p>
              <div className="flex flex-col gap-1 mt-1">
                <span className="text-xs">
                  <span className="text-red-600 font-bold">{report.metrics_summary.num_critical}</span> critical
                </span>
                <span className="text-xs">
                  <span className="text-yellow-600 font-bold">{report.metrics_summary.num_warnings}</span> warnings
                </span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Fairness Metrics */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-lg shadow-lg mb-6 overflow-hidden"
        >
          <button
            onClick={() => toggleSection('metrics')}
            className="w-full px-6 py-4 bg-gradient-to-r from-blue-50 to-blue-100 text-left font-bold text-gray-900 flex justify-between items-center hover:from-blue-100 hover:to-blue-200 transition-colors"
          >
            <span className="text-xl">📊 Fairness Metrics</span>
            <span className="text-2xl">{expandedSections.metrics ? '−' : '+'}</span>
          </button>
          {expandedSections.metrics && (
            <div className="p-6">
              <div className="space-y-4">
                {report.report_json.fairness_metrics.metrics.map((metric, idx) => (
                  <motion.div
                    key={metric.metric}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="border border-gray-200 rounded-lg p-4"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-lg font-bold text-gray-900 capitalize">
                        {metric.metric.replace(/_/g, ' ')}
                      </h3>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${getLevelColor(metric.level)}`}>
                        {getLevelIcon(metric.level)} {metric.level.toUpperCase()}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 mb-2">
                      <div className="text-3xl font-bold" style={{ color: metric.score >= 80 ? '#10b981' : metric.score >= 60 ? '#f59e0b' : '#ef4444' }}>
                        {metric.score.toFixed(2)}
                      </div>
                      <div className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full transition-all"
                          style={{
                            width: `${Math.min(100, metric.score)}%`,
                            backgroundColor: metric.score >= 80 ? '#10b981' : metric.score >= 60 ? '#f59e0b' : '#ef4444'
                          }}
                        />
                      </div>
                    </div>
                    <p className="text-gray-700 text-sm mb-2">{metric.explanation}</p>
                    {Object.keys(metric.details).length > 0 && (
                      <details className="text-xs text-gray-600 mt-2">
                        <summary className="cursor-pointer font-medium hover:text-blue-600">Technical Details</summary>
                        <pre className="mt-2 p-2 bg-gray-50 rounded overflow-x-auto">
                          {JSON.stringify(metric.details, null, 2)}
                        </pre>
                      </details>
                    )}
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </motion.div>

        {/* Recommendations */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-lg shadow-lg mb-6 overflow-hidden"
        >
          <button
            onClick={() => toggleSection('recommendations')}
            className="w-full px-6 py-4 bg-gradient-to-r from-yellow-50 to-yellow-100 text-left font-bold text-gray-900 flex justify-between items-center hover:from-yellow-100 hover:to-yellow-200 transition-colors"
          >
            <span className="text-xl">💡 Recommendations</span>
            <span className="text-2xl">{expandedSections.recommendations ? '−' : '+'}</span>
          </button>
          {expandedSections.recommendations && (
            <div className="p-6">
              <ul className="space-y-3">
                {report.recommendations.map((rec, idx) => {
                  const isCritical = rec.includes('CRITICAL');
                  const isWarning = rec.includes('WARNING');
                  const borderColor = isCritical ? 'border-red-500' : isWarning ? 'border-yellow-500' : 'border-green-500';
                  const bgColor = isCritical ? 'bg-red-50' : isWarning ? 'bg-yellow-50' : 'bg-green-50';
                  
                  return (
                    <motion.li
                      key={idx}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className={`pl-4 py-3 border-l-4 ${borderColor} ${bgColor} rounded-r-lg`}
                    >
                      {rec}
                    </motion.li>
                  );
                })}
              </ul>
            </div>
          )}
        </motion.div>

        {/* Dataset Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-lg shadow-lg mb-6 overflow-hidden"
        >
          <button
            onClick={() => toggleSection('dataset')}
            className="w-full px-6 py-4 bg-gradient-to-r from-gray-50 to-gray-100 text-left font-bold text-gray-900 flex justify-between items-center hover:from-gray-100 hover:to-gray-200 transition-colors"
          >
            <span className="text-xl">📁 Test Dataset</span>
            <span className="text-2xl">{expandedSections.dataset ? '−' : '+'}</span>
          </button>
          {expandedSections.dataset && (
            <div className="p-6">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">Total Cases</p>
                  <p className="text-xl font-bold text-gray-900">
                    {report.report_json.synthetic_dataset.total_cases}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">Edge Cases</p>
                  <p className="text-xl font-bold text-gray-900">
                    {report.report_json.synthetic_dataset.edge_cases}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">Avg Risk Score</p>
                  <p className="text-xl font-bold text-gray-900">
                    {report.report_json.validation_summary.avg_risk_score?.toFixed(1) || 'N/A'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </motion.div>

        {/* Raw JSON */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-lg shadow-lg overflow-hidden"
        >
          <button
            onClick={() => toggleSection('rawJson')}
            className="w-full px-6 py-4 bg-gradient-to-r from-gray-50 to-gray-100 text-left font-bold text-gray-900 flex justify-between items-center hover:from-gray-100 hover:to-gray-200 transition-colors"
          >
            <span className="text-xl">🔍 Raw JSON</span>
            <span className="text-2xl">{expandedSections.rawJson ? '−' : '+'}</span>
          </button>
          {expandedSections.rawJson && (
            <div className="p-6">
              <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto text-xs">
                {JSON.stringify(report.report_json, null, 2)}
              </pre>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
