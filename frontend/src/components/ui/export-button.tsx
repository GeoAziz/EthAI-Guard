'use client';
import React, { useState } from 'react';
import { exportToCSV, exportToJSON, exportToPDF, generateTableHTML } from '@/lib/export';

interface ExportButtonProps {
  data: any[];
  filename: string;
  columns?: { label: string; key: string }[];
  formats?: ('csv' | 'json' | 'pdf')[];
  title?: string;
}

export function ExportButton({
  data = [],
  filename = 'export',
  columns,
  formats = ['csv', 'json'],
  title,
}: ExportButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async (format: 'csv' | 'json' | 'pdf') => {
    setIsExporting(true);
    try {
      if (format === 'csv') {
        const csvColumns = columns ? columns.map((c) => c.key) : undefined;
        exportToCSV(data, filename, csvColumns);
      } else if (format === 'json') {
        exportToJSON(data, filename);
      } else if (format === 'pdf' && columns) {
        const html = generateTableHTML(columns, data);
        exportToPDF(html, filename, title);
      }
      setIsOpen(false);
    } catch (err) {
      console.error(`Failed to export as ${format}`, err);
    } finally {
      setIsExporting(false);
    }
  };

  if (data.length === 0) {
    return null;
  }

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="btn text-xs sm:text-sm px-3 sm:px-4 py-2 flex items-center gap-2"
        disabled={isExporting}
        aria-expanded={isOpen}
      >
        <span>📥 {isExporting ? 'Exporting...' : 'Export'}</span>
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 bg-white border rounded-lg shadow-lg p-2 z-50 min-w-max">
          {formats.includes('csv') && (
            <button
              onClick={() => handleExport('csv')}
              className="w-full text-left px-3 py-2 text-xs sm:text-sm hover:bg-gray-100 rounded"
              disabled={isExporting}
            >
              📊 Export as CSV
            </button>
          )}
          {formats.includes('json') && (
            <button
              onClick={() => handleExport('json')}
              className="w-full text-left px-3 py-2 text-xs sm:text-sm hover:bg-gray-100 rounded"
              disabled={isExporting}
            >
              {} Export as JSON
            </button>
          )}
          {formats.includes('pdf') && columns && (
            <button
              onClick={() => handleExport('pdf')}
              className="w-full text-left px-3 py-2 text-xs sm:text-sm hover:bg-gray-100 rounded"
              disabled={isExporting}
            >
              📄 Export as PDF
            </button>
          )}
        </div>
      )}
    </div>
  );
}
