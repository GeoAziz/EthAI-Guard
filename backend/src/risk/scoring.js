// Risk scoring combines simulation + rules engine outputs into a 0-100 score & category.

function computeRisk(simulation, rules) {
  let base = simulation.normalized_output; // 0-100 already
  const reasons = [];

  if (rules.fairness.fairness_flag) {
    base = Math.min(100, base + 15); // fairness imbalance bump
    reasons.push('fairness_imbalance');
  }
  if (rules.bias.bias_flag) {
    base = Math.min(100, base + 20); // extreme output bump
    reasons.push('extreme_output_bias_suspect');
  }
  if (rules.compliance.compliance_flag) {
    base = Math.min(100, base + 10);
    reasons.push('compliance_missing_fields');
  }

  let level;
  if (base >= 67) {
    level = 'high';
  } else if (base >= 34) {
    level = 'medium';
  } else {
    level = 'low';
  }

  return { score: base, level, reasons };
}

module.exports = { computeRisk };
