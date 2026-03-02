/**
 * Data Export Utilities
 * Functions for exporting data to CSV, PDF, and JSON formats
 */

export function exportToCSV(
  data: any[],
  filename: string,
  columns?: string[]
): void {
  if (!data || data.length === 0) {
    console.warn('No data to export');
    return;
  }

  // Determine columns to export
  const keys = columns || Object.keys(data[0]);

  // Create CSV header
  const header = keys.map((key) => `"${key}"`).join(',');

  // Create CSV rows
  const rows = data.map((row) =>
    keys
      .map((key) => {
        const value = row[key];
        if (value === null || value === undefined) return '""';
        if (typeof value === 'string') return `"${value.replace(/"/g, '""')}"`;
        if (typeof value === 'object') return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
        return `"${value}"`;
      })
      .join(',')
  );

  const csv = [header, ...rows].join('\n');

  // Trigger download
  downloadFile(csv, `${filename}.csv`, 'text/csv');
}

export function exportToJSON(data: any[], filename: string): void {
  if (!data || data.length === 0) {
    console.warn('No data to export');
    return;
  }

  const json = JSON.stringify(data, null, 2);
  downloadFile(json, `${filename}.json`, 'application/json');
}

export function exportToPDF(
  content: string,
  filename: string,
  title?: string
): void {
  // Note: This is a simplified implementation
  // For production, use a library like jsPDF or html2pdf
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>${title || filename}</title>
        <style>
          body { font-family: Arial, sans-serif; }
          h1 { color: #333; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; }
        </style>
      </head>
      <body>
        <h1>${title || 'Report'}</h1>
        ${content}
      </body>
    </html>
  `;

  downloadFile(html, `${filename}.html`, 'text/html');
}

function downloadFile(
  content: string,
  filename: string,
  mimeType: string
): void {
  const blob = new Blob([content], { type: mimeType });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

export function generateTableHTML(
  columns: { label: string; key: string }[],
  data: any[]
): string {
  const headerRow = `
    <tr>
      ${columns.map((col) => `<th>${col.label}</th>`).join('')}
    </tr>
  `;

  const bodyRows = data
    .map(
      (row) => `
    <tr>
      ${columns.map((col) => `<td>${row[col.key] || '—'}</td>`).join('')}
    </tr>
  `
    )
    .join('');

  return `<table><thead>${headerRow}</thead><tbody>${bodyRows}</tbody></table>`;
}
