"use client";
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';

interface FeatureRow { key: string; value: string; }
interface EvaluationResponse {
  risk: { score: number; level: string; reasons: string[] };
  explanation: { summary: string; details: string[]; recommended_action: string };
  rules: any;
  simulation: any;
  request_id: string;
  timestamp: string;
  user_id: string;
  model_id: string;
}

const initialRow: FeatureRow = { key: 'feature_a', value: '1,2,3' };

function parseFeatures(rows: FeatureRow) {
  const out: Record<string, any> = {};
  rows.forEach(r => {
    if (!r.key) return;
    if (r.value.includes(',')) {
      out[r.key] = r.value.split(',').map(v => Number(v.trim())).filter(v => !isNaN(v));
    } else {
      const num = Number(r.value);
      out[r.key] = isNaN(num) ? r.value : num;
    }
  });
  return out;
}

const RiskGauge: React.FC<{ score: number; level: string }> = ({ score, level }) => {
  const color = level === 'high' ? 'bg-red-500' : level === 'medium' ? 'bg-amber-500' : 'bg-green-500';
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm"><span>Risk Score</span><span>{score} / 100</span></div>
      <div className="h-4 w-full bg-gray-800 rounded overflow-hidden">
        <motion.div initial={{ width: 0 }} animate={{ width: `${score}%` }} transition={{ duration: 0.6 }} className={`h-full ${color}`} />
      </div>
      <div className="text-xs uppercase tracking-wider text-gray-400">Level: {level}</div>
    </div>
  );
};

export default function DecisionAnalysisPage() {
  const [rows, setRows] = useState<FeatureRow[]>([initialRow]);
  const [modelId, setModelId] = useState('modelA');
  const [userId, setUserId] = useState('user123');
  const [sensitiveAttr, setSensitiveAttr] = useState('sensitive');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string|null>(null);
  const [result, setResult] = useState<EvaluationResponse|null>(null);
  const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

  const addRow = () => setRows(r => [...r, { key: '', value: '' }]);
  const removeRow = (idx: number) => setRows(r => r.filter((_, i) => i !== idx));
  const updateRow = (idx: number, patch: Partial<FeatureRow>) => setRows(r => r.map((row, i) => i === idx ? { ...row, ...patch } : row));

  const onSubmit = async () => {
    setLoading(true); setError(null); setResult(null);
    try {
      const input_features = parseFeatures(rows);
      const context = { sensitive_attribute: sensitiveAttr };
      const payload = { user_id: userId, model_id: modelId, input_features, context };
      const resp = await axios.post(`${apiBase}/v1/evaluate`, payload, { timeout: 10000 });
      setResult(resp.data);
    } catch (e: any) {
      setError(e?.response?.data?.error || 'evaluation_failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-semibold mb-2">Decision Analysis Preview</h1>
      <p className="text-sm text-gray-400 mb-6">Submit feature inputs to evaluate ethical risk and receive an explanation.</p>
      <div className="grid md:grid-cols-2 gap-8">
        <div>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-1">
                <label className="text-xs uppercase tracking-wider">Model ID</label>
                <input value={modelId} onChange={e => setModelId(e.target.value)} className="mt-1 w-full bg-gray-800 rounded px-2 py-1 text-sm" />
              </div>
              <div className="col-span-1">
                <label className="text-xs uppercase tracking-wider">User ID</label>
                <input value={userId} onChange={e => setUserId(e.target.value)} className="mt-1 w-full bg-gray-800 rounded px-2 py-1 text-sm" />
              </div>
              <div className="col-span-1">
                <label className="text-xs uppercase tracking-wider">Sensitive Attr</label>
                <input value={sensitiveAttr} onChange={e => setSensitiveAttr(e.target.value)} className="mt-1 w-full bg-gray-800 rounded px-2 py-1 text-sm" />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs uppercase tracking-wider">Features</span>
                <button onClick={addRow} className="text-xs px-2 py-1 bg-gray-700 rounded">Add</button>
              </div>
              {rows.map((r, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <input placeholder="key" value={r.key} onChange={e => updateRow(idx,{ key: e.target.value })} className="bg-gray-800 rounded px-2 py-1 text-sm flex-1" />
                  <input placeholder="value(s)" value={r.value} onChange={e => updateRow(idx,{ value: e.target.value })} className="bg-gray-800 rounded px-2 py-1 text-sm flex-[2]" />
                  <button onClick={() => removeRow(idx)} className="text-red-400 text-xs">✕</button>
                </div>
              ))}
            </div>
            <button disabled={loading} onClick={onSubmit} className="mt-4 w-full bg-blue-600 hover:bg-blue-500 disabled:bg-blue-900 rounded py-2 text-sm font-medium">
              {loading ? 'Evaluating…' : 'Evaluate'}
            </button>
            {error && <div className="mt-2 text-red-400 text-sm">Error: {error}</div>}
          </div>
        </div>
        <div>
          <AnimatePresence>
            {!result && !loading && !error && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="border border-dashed border-gray-700 rounded p-6 text-sm text-gray-400">
                Results will appear here after evaluation.
              </motion.div>
            )}
            {loading && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-6 text-sm">Processing...</motion.div>
            )}
            {result && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y:0 }} className={`p-6 rounded border ${result.risk.level==='high' ? 'border-red-500' : 'border-gray-700'}`}>
                <RiskGauge score={result.risk.score} level={result.risk.level} />
                <div className="mt-4 space-y-2">
                  <div className="text-sm font-medium">Explanation</div>
                  <div className="text-xs text-gray-300">{result.explanation.summary}</div>
                  <details className="mt-2">
                    <summary className="cursor-pointer text-xs text-blue-400">Details</summary>
                    <ul className="mt-2 list-disc list-inside text-xs space-y-1">
                      {result.explanation.details.map((d,i)=>(<li key={i}>{d}</li>))}
                    </ul>
                    <div className="mt-2 text-xs italic text-gray-400">{result.explanation.recommended_action}</div>
                  </details>
                </div>
                <div className="mt-4 text-xs text-gray-500 space-y-1">
                  <div>Request ID: {result.request_id}</div>
                  <div>Timestamp: {result.timestamp}</div>
                  <div>Model ID: {result.model_id}</div>
                  <div>User ID: {result.user_id}</div>
                </div>
              </motion.div>
            )}
            {error && !loading && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-6 rounded border border-red-600 text-sm">
                An error occurred. Please adjust inputs and retry.
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
