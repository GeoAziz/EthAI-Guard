const PDFDocument = require('pdfkit');
const { stringify } = require('csv-stringify/sync');
const logger = require('../logger');

// Optional imports with graceful fallbacks
let ExcelJS;
try {
  ExcelJS = require('exceljs');
} catch (e) {
  logger.warn({ err: e }, 'ExcelJS not available, Excel export will be limited');
}

class ExportService {
  /**
   * Generate a SHAP analysis PNG image (base64 encoded SVG representation)
   * In production, this would generate actual matplotlib/seaborn plots
   */
  generateShapPlot(featureImportance, plotType = 'summary') {
    try {
      // Create SVG-based plot as fallback
      // In production, this would render actual SHAP plots via matplotlib
      const features = Object.entries(featureImportance)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10);

      const maxImportance = Math.max(...features.map(([, v]) => v), 0.1);
      const height = 300 + features.length * 30;
      const width = 800;

      let svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <style>
            .title { font-size: 20px; font-weight: bold; }
            .label { font-size: 12px; }
            .value { font-size: 11px; }
          </style>
        </defs>
        <rect width="${width}" height="${height}" fill="white"/>
        <text x="20" y="30" class="title">SHAP ${plotType} Plot</text>`;

      features.forEach(([feature, importance], idx) => {
        const y = 70 + idx * 30;
        const barWidth = (importance / maxImportance) * 600;

        svg += `
          <text x="20" y="${y + 15}" class="label">${feature}</text>
          <rect x="180" y="${y + 5}" width="${barWidth}" height="20" fill="#3b82f6" />
          <text x="${190 + barWidth}" y="${y + 15}" class="value">${(importance * 100).toFixed(1)}%</text>`;
      });

      svg += '</svg>';
      return Buffer.from(svg).toString('base64');
    } catch (err) {
      logger.error({ err }, 'shap_plot_generation_failed');
      throw new Error('Failed to generate SHAP plot');
    }
  }

  /**
   * Export analysis metrics as CSV
   */
  async exportMetricsCSV(analysis) {
    try {
      const rows = [];

      // Add summary metrics
      if (analysis.summary) {
        const { fairness_score, n_rows, fairness_metrics = {} } = analysis.summary;

        rows.push(['Metric', 'Value', 'Unit']);
        rows.push(['Total Records', n_rows || 0, 'rows']);
        rows.push(['Overall Fairness Score', fairness_score || 0, '%']);

        // Add fairness metrics
        Object.entries(fairness_metrics).forEach(([key, val]) => {
          const value = typeof val === 'number' ? val.toFixed(4) : val;
          rows.push([key, value, 'score']);
        });
      } else {
        rows.push(['Metric', 'Value', 'Unit']);
      }

      // Convert to CSV using stringify
      const csvString = stringify(rows);
      return csvString;
    } catch (err) {
      logger.error({ err }, 'csv_export_failed');
      throw new Error('Failed to export metrics as CSV');
    }
  }

  /**
   * Export full analysis report as Excel
   */
  async exportAnalysisExcel(analysis, userId, reportId) {
    try {
      if (!ExcelJS) {
        // Fallback to CSV if ExcelJS is not available
        logger.warn('ExcelJS not available, falling back to CSV');
        return this.exportMetricsCSV(analysis);
      }

      const workbook = new ExcelJS.Workbook();

      // Sheet 1: Summary
      const summarySheet = workbook.addWorksheet('Summary');
      summarySheet.columns = [
        { header: 'Metric', key: 'metric', width: 25 },
        { header: 'Value', key: 'value', width: 20 },
        { header: 'Unit', key: 'unit', width: 15 },
      ];

      const summaryRows = [];
      if (analysis.summary) {
        const { fairness_score, n_rows, fairness_metrics = {} } = analysis.summary;

        summaryRows.push({
          metric: 'Report ID',
          value: reportId,
          unit: '-'
        });

        summaryRows.push({
          metric: 'Total Records Analyzed',
          value: n_rows || 0,
          unit: 'rows'
        });

        summaryRows.push({
          metric: 'Overall Fairness Score',
          value: fairness_score || 0,
          unit: '%'
        });

        summaryRows.push({
          metric: 'Analysis Date',
          value: new Date().toISOString().split('T')[0],
          unit: '-'
        });

        // Add fairness metrics
        Object.entries(fairness_metrics).forEach(([key, val]) => {
          summaryRows.push({
            metric: key.replace(/_/g, ' ').toUpperCase(),
            value: typeof val === 'number' ? val.toFixed(4) : val,
            unit: 'score'
          });
        });
      }

      summarySheet.addRows(summaryRows);
      summarySheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
      summarySheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3b82f6' } };

      // Sheet 2: Feature Importance
      const featureSheet = workbook.addWorksheet('Feature Importance');
      featureSheet.columns = [
        { header: 'Feature', key: 'feature', width: 25 },
        { header: 'Importance', key: 'importance', width: 15 },
        { header: 'Percentage', key: 'percentage', width: 15 },
      ];

      const features = Object.entries(analysis.summary?.featureImportance || {})
        .sort(([, a], [, b]) => b - a)
        .map(([feature, importance]) => ({
          feature,
          importance: importance.toFixed(4),
          percentage: `${(importance * 100).toFixed(1)}%`
        }));

      featureSheet.addRows(features);
      featureSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
      featureSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3b82f6' } };

      // Sheet 3: Audit Trail
      const auditSheet = workbook.addWorksheet('Audit Trail');
      auditSheet.columns = [
        { header: 'Event', key: 'event', width: 25 },
        { header: 'Timestamp', key: 'timestamp', width: 20 },
        { header: 'User', key: 'user', width: 20 },
      ];

      auditSheet.addRows([
        {
          event: 'Analysis Created',
          timestamp: new Date().toISOString(),
          user: userId
        },
        {
          event: 'Report Generated',
          timestamp: new Date().toISOString(),
          user: userId
        },
        {
          event: 'Export Completed',
          timestamp: new Date().toISOString(),
          user: userId
        }
      ]);

      auditSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
      auditSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3b82f6' } };

      const buffer = await workbook.xlsx.writeBuffer();
      return buffer;
    } catch (err) {
      logger.error({ err }, 'excel_export_failed');
      throw new Error('Failed to export analysis as Excel');
    }
  }

  /**
   * Export analysis report as PDF
   */
  async exportAnalysisPDF(analysis, userId, reportId) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50 });
        const chunks = [];

        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        // Title
        doc.fontSize(24).font('Helvetica-Bold').text('SHAP Analysis Report', { align: 'center' });
        doc.moveDown(0.5);

        // Report Info
        doc.fontSize(11).font('Helvetica');
        doc.text(`Report ID: ${reportId}`, { align: 'left' });
        doc.text(`Generated: ${new Date().toISOString()}`, { align: 'left' });
        doc.text(`User: ${userId}`, { align: 'left' });
        doc.moveDown(1);

        // Summary Section
        doc.fontSize(16).font('Helvetica-Bold').text('Executive Summary', { underline: true });
        doc.moveDown(0.3);

        if (analysis.summary) {
          const { fairness_score, n_rows } = analysis.summary;
          doc.fontSize(11).font('Helvetica');
          doc.text(`Total Records Analyzed: ${n_rows || 0}`, { indent: 20 });
          doc.text(`Overall Fairness Score: ${fairness_score || 0}%`, { indent: 20 });
          doc.moveDown(0.5);
        }

        // Feature Importance Section
        doc.fontSize(16).font('Helvetica-Bold').text('Top Features by Importance', { underline: true });
        doc.moveDown(0.3);

        const features = Object.entries(analysis.summary?.featureImportance || {})
          .sort(([, a], [, b]) => b - a)
          .slice(0, 10);

        doc.fontSize(10).font('Helvetica');
        features.forEach(([feature, importance], idx) => {
          const percentage = (importance * 100).toFixed(1);
          doc.text(`${idx + 1}. ${feature}: ${percentage}%`, { indent: 20 });
        });

        doc.moveDown(1);
        doc.fontSize(10).font('Helvetica-Oblique').text('This is an automated report generated by EthixAI', { align: 'center' });

        doc.end();
      } catch (err) {
        logger.error({ err }, 'pdf_export_failed');
        reject(new Error('Failed to export analysis as PDF'));
      }
    });
  }

  /**
   * Export analysis with audit trail
   */
  async exportComplete(analysis, userId, reportId, exportType = 'pdf') {
    try {
      let buffer;

      switch (exportType.toLowerCase()) {
        case 'csv':
          return await this.exportMetricsCSV(analysis);
        case 'excel':
        case 'xlsx':
          buffer = await this.exportAnalysisExcel(analysis, userId, reportId);
          break;
        case 'pdf':
        default:
          buffer = await this.exportAnalysisPDF(analysis, userId, reportId);
          break;
      }

      return buffer;
    } catch (err) {
      logger.error({ err, type: exportType }, 'export_complete_failed');
      throw err;
    }
  }
}

module.exports = new ExportService();
