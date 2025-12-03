// Ethical rules engine evaluating fairness, bias, compliance.
// Input: simulation output + original features + context metadata.
// Output: rule results with thresholds and flags.

function evaluateFairness(inputFeatures, context) {
  // Simple heuristic: if sensitive attribute distribution is imbalanced (>70% one value) flag.
  const sensitiveKey = context?.sensitive_attribute || 'sensitive';
  const data = inputFeatures[sensitiveKey];
  if (!Array.isArray(data) || data.length === 0) {
    return { fairness_flag: false, reason: 'no_sensitive_data', ratio: null, threshold: 0.7 };
  }
  const counts = data.reduce((acc, v) => {
    acc[v] = (acc[v] || 0) + 1; return acc;
  }, {});
  const maxRatio = Math.max(...Object.values(counts)) / data.length;
  const fairness_flag = maxRatio > 0.7;
  return { fairness_flag, reason: fairness_flag ? 'distribution_imbalanced' : 'distribution_ok', ratio: Number(maxRatio.toFixed(3)), threshold: 0.7 };
}

function evaluateBias(simulation, context) {
  // If normalized output extreme (>90) and fairness flag triggered, bias suspicion.
  const extreme = simulation.normalized_output > 90;
  return { bias_flag: extreme, reason: extreme ? 'extreme_output' : 'normal_range', output: simulation.normalized_output, threshold: 90 };
}

function evaluateCompliance(inputFeatures, context) {
  // If required metadata fields missing -> compliance flag.
  const required = ['decision_timestamp', 'user_id', 'model_id'];
  const missing = required.filter(k => !context || context[k] == null);
  const compliant = missing.length === 0;
  return { compliance_flag: !compliant, missing_fields: missing, required_count: required.length };
}

function runRules(simulation, inputFeatures, context) {
  const fairness = evaluateFairness(inputFeatures, context);
  const bias = evaluateBias(simulation, context);
  const compliance = evaluateCompliance(inputFeatures, context);
  return { fairness, bias, compliance };
}

module.exports = { runRules };
