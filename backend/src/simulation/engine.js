// Deterministic pseudo-model simulation engine
// Produces stable output based on model_id + ordered feature values.
const crypto = require('crypto');

function normalizeNumber(n) {
  if (!isFinite(n)) {
    return 0;
  }
  return Math.max(-1e6, Math.min(1e6, Number(n)));
}

function flattenFeatures(inputFeatures) {
  // Convert object of arrays or scalar values to a single array for hashing + scoring.
  const out = [];
  const keys = Object.keys(inputFeatures).sort();
  for (const k of keys) {
    const v = inputFeatures[k];
    if (Array.isArray(v)) {
      for (const item of v) {
        out.push(normalizeNumber(item));
      }
    } else if (typeof v === 'object' && v !== null) {
      // nested object -> JSON length heuristic
      out.push(JSON.stringify(v).length % 997);
    } else {
      out.push(normalizeNumber(v));
    }
  }
  return out;
}

function simulate(modelId, inputFeatures) {
  const vec = flattenFeatures(inputFeatures);
  const hash = crypto.createHash('sha256').update(`${modelId}:${vec.join(',')}`).digest('hex');
  // Use first 8 hex chars as a base integer
  const baseInt = parseInt(hash.slice(0, 8), 16);
  // Raw output as weighted sum mod range
  const sum = vec.reduce((acc, v, idx) => acc + (v * ((idx % 5) + 1)), 0);
  const rawScore = (Math.abs(sum) + (baseInt % 1000)) % 1000; // 0-999
  const normalized = Math.round((rawScore / 999) * 100); // 0-100
  return {
    raw_output: rawScore,
    normalized_output: normalized,
    feature_count: vec.length,
    feature_vector_preview: vec.slice(0, 10),
  };
}

module.exports = { simulate };
