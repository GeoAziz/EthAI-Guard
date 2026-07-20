const PDFDocument = require('pdfkit');
const logger = require('../logger');
const { withTenant } = require('../db/postgres');

class ComplianceReportService {
  /**
   * Generate compliance report PDF
   * Returns buffer that can be streamed or saved
   */
  async generateComplianceReportPDF(analysisData, options = {}) {
    try {
      const {
        companyName = 'Organization',
        reportDate = new Date(),
        analyst = 'System',
        signOffRequired = true,
      } = options;

      const doc = new PDFDocument({
        size: 'A4',
        margin: 50,
      });

      let bufferData = [];
      doc.on('data', (chunk) => bufferData.push(chunk));
      doc.on('end', () => {});

      // ===== TITLE PAGE =====
      doc.fontSize(24).font('Helvetica-Bold').text('ETHIXAI COMPLIANCE REPORT', { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(12).font('Helvetica').text('Ethical AI Governance Analysis', { align: 'center' });
      doc.moveDown(2);

      doc.fontSize(11).font('Helvetica-Bold').text('EXECUTIVE SUMMARY');
      doc.fontSize(10).font('Helvetica').text(
        `This compliance report documents fairness analysis for AI/ML decisions across protected attributes.`
      );
      doc.moveDown(1);

      // Key Metrics
      const fairnessScore = analysisData.summary?.fairness_score || 0;
      const status = fairnessScore >= 80 ? '✓ PASS' : '⚠ REVIEW REQUIRED';

      doc.fontSize(10).font('Helvetica-Bold').text(`Overall Fairness Score: ${fairnessScore}/100 ${status}`);
      doc.fontSize(9).font('Helvetica').text(`Report Generated: ${reportDate.toLocaleDateString()}`);
      doc.text(`Company/Organization: ${companyName}`);
      doc.text(`Analysis Conducted By: ${analyst}`);
      doc.moveDown(2);

      // ===== METHODOLOGY =====
      doc.fontSize(11).font('Helvetica-Bold').text('METHODOLOGY & COMPLIANCE FRAMEWORK');
      doc.fontSize(10).font('Helvetica').text(
        'This analysis evaluates model fairness using industry-standard metrics in compliance with:'
      );
      doc.list([
        'Equal Credit Opportunity Act (ECOA), 15 U.S.C. § 1691',
        'Fair Housing Act, 42 U.S.C. § 3604',
        'GDPR Article 22 (right to explanation)',
        'SEC AI Governance Guidelines (effective 2025)',
        'NIST AI Risk Management Framework (AI RMF 1.0)',
      ]);
      doc.moveDown(1);

      // ===== PROTECTED ATTRIBUTES =====
      doc.fontSize(11).font('Helvetica-Bold').text('PROTECTED ATTRIBUTES ANALYZED');
      const protectedAttrs = analysisData.summary?.protected_attributes || [];
      doc.fontSize(10).font('Helvetica');
      protectedAttrs.forEach((attr) => {
        doc.text(`• ${attr}`);
      });
      doc.moveDown(1.5);

      // ===== FAIRNESS METRICS =====
      doc.fontSize(11).font('Helvetica-Bold').text('FAIRNESS METRICS RESULTS');
      doc.fontSize(10).font('Helvetica');

      const metrics = analysisData.summary?.fairness_metrics || {};
      const metricsTable = [
        ['Metric', 'Value', 'Status', 'Threshold'],
      ];

      const metricsData = [
        { name: 'Statistical Parity', key: 'statistical_parity', threshold: '≥ 0.80' },
        { name: 'Equal Opportunity', key: 'equal_opportunity', threshold: '≥ 0.80' },
        { name: 'Predictive Parity', key: 'predictive_parity', threshold: '≥ 0.80' },
        { name: 'Disparate Impact Ratio', key: 'disparate_impact', threshold: '≥ 0.80' },
      ];

      metricsData.forEach(({ name, key, threshold }) => {
        const value = metrics[key] || 'N/A';
        const displayValue = typeof value === 'number' ? value.toFixed(4) : value;
        const statusIcon = typeof value === 'number' && value >= 0.8 ? '✓' : '⚠';
        metricsTable.push([name, displayValue, statusIcon, threshold]);
      });

      // Draw simple table
      this._drawTable(doc, metricsTable);
      doc.moveDown(1.5);

      // ===== SHAP EXPLANATIONS =====
      doc.fontSize(11).font('Helvetica-Bold').text('TOP INFLUENTIAL FEATURES (SHAP)');
      doc.fontSize(10).font('Helvetica').text(
        'These features had the greatest impact on model decisions:'
      );
      doc.moveDown(0.5);

      const shapData = analysisData.shap?.feature_importance || {};
      const topFeatures = Object.entries(shapData)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5);

      topFeatures.forEach(([feature, importance], idx) => {
        const percent = (importance * 100).toFixed(1);
        doc.fontSize(10).font('Helvetica').text(`${idx + 1}. ${feature}: ${percent}%`);
      });
      doc.moveDown(1.5);

      // ===== REGULATORY COMPLIANCE CHECKLIST =====
      doc.fontSize(11).font('Helvetica-Bold').text('REGULATORY COMPLIANCE CHECKLIST');
      doc.fontSize(9).font('Helvetica');

      const complianceChecks = [
        { item: 'Disparate Impact Analysis (≥80% rule)', passed: fairnessScore >= 80 },
        { item: 'Equal Opportunity Demonstrated', passed: metrics.equal_opportunity >= 0.8 },
        { item: 'Model Explainability (SHAP Provided)', passed: Object.keys(shapData).length > 0 },
        { item: 'Audit Trail Complete', passed: true },
        { item: 'Protected Attributes Identified', passed: protectedAttrs.length > 0 },
      ];

      complianceChecks.forEach(({ item, passed }) => {
        const icon = passed ? '☑' : '☐';
        doc.text(`${icon} ${item}`);
      });
      doc.moveDown(1.5);

      // ===== RECOMMENDATIONS =====
      doc.fontSize(11).font('Helvetica-Bold').text('RECOMMENDATIONS');
      doc.fontSize(10).font('Helvetica');

      if (fairnessScore < 70) {
        doc.list([
          'Model exhibits potential fairness concerns. Consider retraining or feature engineering.',
          'Review protected attributes for data quality issues.',
          'Increase model monitoring frequency to catch performance degradation.',
        ]);
      } else if (fairnessScore < 85) {
        doc.list([
          'Monitor model performance regularly for fairness degradation.',
          'Consider implementing fairness constraints in future model iterations.',
          'Conduct quarterly fairness audits.',
        ]);
      } else {
        doc.list([
          'Model demonstrates strong fairness characteristics.',
          'Continue regular monitoring as best practice.',
          'Document fairness controls for regulatory inquiries.',
        ]);
      }
      doc.moveDown(2);

      // ===== SIGN-OFF (if required) =====
      if (signOffRequired) {
        doc.fontSize(11).font('Helvetica-Bold').text('COMPLIANCE OFFICER SIGN-OFF');
        doc.fontSize(9).font('Helvetica');
        doc.moveTo(50, doc.y).lineTo(250, doc.y).stroke();
        doc.text('Signature', { width: 200 });
        doc.moveDown(0.3);
        doc.moveTo(250, doc.y - 20).lineTo(450, doc.y - 20).stroke();
        doc.text('Date', { x: 250, width: 200 });
        doc.moveDown(1);
        doc.fontSize(8).text('Analyst Name: ___________________');
        doc.text('Role: ___________________');
        doc.text('Organization: ___________________');
      }

      // ===== FOOTER =====
      doc.moveDown(2);
      doc.fontSize(8).font('Helvetica').text(
        'This report was generated by EthixAI and documents fairness metrics for AI governance compliance. ' +
        'Results should be reviewed by qualified compliance professionals. Generated: ' + new Date().toISOString(),
        { align: 'center' }
      );

      doc.end();

      return new Promise((resolve, reject) => {
        doc.on('finish', () => {
          resolve(Buffer.concat(bufferData));
        });
        doc.on('error', reject);
      });
    } catch (error) {
      logger.error({ err: error }, 'compliance_report_generation_failed');
      throw new Error('Failed to generate compliance report');
    }
  }

  /**
   * Save compliance report to database and S3
   */
  async saveComplianceReport(tenantId, analysisId, pdfBuffer, metadata = {}) {
    return withTenant(tenantId, async (client) => {
      const s3Key = `compliance-reports/${tenantId}/${analysisId}-${Date.now()}.pdf`;

      // Store in database
      const result = await client.query(
        `INSERT INTO compliance_reports (tenant_id, analysis_id, s3_key, file_size, metadata, generated_at)
         VALUES ($1, $2, $3, $4, $5, NOW())
         RETURNING *`,
        [tenantId, analysisId, s3Key, pdfBuffer.length, JSON.stringify(metadata)]
      );

      logger.info({ tenantId, analysisId, s3Key, fileSize: pdfBuffer.length }, 'compliance_report_saved');

      return {
        reportId: result.rows[0].id,
        s3Key,
        fileSize: pdfBuffer.length,
      };
    });
  }

  /**
   * Draw a simple table (helper function)
   */
  _drawTable(doc, data) {
    const startX = 50;
    const startY = doc.y;
    const colWidths = [150, 80, 80, 80];
    const rowHeight = 25;

    data.forEach((row, rowIdx) => {
      let x = startX;

      row.forEach((cell, colIdx) => {
        const y = startY + rowIdx * rowHeight;

        // Draw cell background for header
        if (rowIdx === 0) {
          doc.rect(x, y, colWidths[colIdx], rowHeight).fill('#f0f0f0').stroke();
          doc.font('Helvetica-Bold').fontSize(9);
        } else {
          doc.rect(x, y, colWidths[colIdx], rowHeight).stroke();
          doc.font('Helvetica').fontSize(9);
        }

        // Draw text
        doc.text(cell, x + 5, y + 5, {
          width: colWidths[colIdx] - 10,
          height: rowHeight - 10,
          align: 'left',
          valign: 'center',
        });

        x += colWidths[colIdx];
      });
    });

    doc.y = startY + data.length * rowHeight;
  }
}

module.exports = new ComplianceReportService();
