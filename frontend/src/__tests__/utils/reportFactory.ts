export function makeReportResponse({
  withBias = true,
  n_rows = 10,
  overallFairnessScore = 0.95,
  featureImportance = { featA: 0.6 },
  complianceStatus = 'compliant',
  violations = [],
} = {}) {
  const summary: any = { n_rows };
  if (withBias) {
    summary.biasMetrics = true;
    summary.overallFairnessScore = overallFairnessScore;
    summary.riskLevel = 'low';
  }
  if (featureImportance) summary.featureImportance = featureImportance;
  summary.complianceStatus = complianceStatus;
  if (violations && violations.length) summary.violations = violations;

  return {
    data: {
      report: {
        summary,
        explanation_plot: null,
      },
    },
  };
}

export default makeReportResponse;
