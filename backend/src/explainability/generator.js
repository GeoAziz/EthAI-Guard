// Explanation generator builds human-readable summary & details from risk + rules.

function generateExplanation(risk, rules, simulation) {
  const summary = `Risk level: ${risk.level.toUpperCase()} (score=${risk.score}).`;
  const detailLines = [];

  if (risk.reasons.length === 0) {
    detailLines.push('No specific risk amplifiers triggered; baseline simulation output considered acceptable.');
  } else {
    for (const r of risk.reasons) {
      switch (r) {
        case 'fairness_imbalance':
          detailLines.push(`Fairness imbalance: sensitive attribute distribution ratio=${rules.fairness.ratio} exceeded threshold ${rules.fairness.threshold}.`);
          break;
        case 'extreme_output_bias_suspect':
          detailLines.push(`Extreme output: normalized model output ${simulation.normalized_output} exceeded bias suspicion threshold ${rules.bias.threshold}.`);
          break;
        case 'compliance_missing_fields':
          detailLines.push(`Compliance issue: required metadata fields missing (${rules.compliance.missing_fields.join(', ') || 'none'}).`);
          break;
        default:
          detailLines.push(`Additional factor: ${r}`);
      }
    }
  }

  const recommendedAction = risk.level === 'high'
    ? 'Immediate review required; consider manual override or secondary model audit.'
    : risk.level === 'medium'
      ? 'Monitor this decision; consider sampling for fairness audit.'
      : 'No action required beyond routine logging.';

  return {
    summary,
    details: detailLines,
    recommended_action: recommendedAction,
  };
}

module.exports = { generateExplanation };
