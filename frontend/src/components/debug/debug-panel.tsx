/**
 * Debug Panel Component
 * Displays login and navigation debug logs
 * Activate with ?show-logs=1 query parameter
 */

'use client';

import React, { useState, useEffect } from 'react';
import { debugLogger, type DebugLog } from '@/lib/debug-logger';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { X, RotateCcw, Copy } from 'lucide-react';

interface DebugPanelProps {
  onClose?: () => void;
}

export function DebugPanel({ onClose }: DebugPanelProps) {
  const [logs, setLogs] = useState<DebugLog[]>([]);
  const [filter, setFilter] = useState<string>('');
  const [levelFilter, setLevelFilter] = useState<string>('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const refreshLogs = () => {
      setLogs(debugLogger.getLogs());
    };

    refreshLogs();
    const interval = setInterval(refreshLogs, 500);
    return () => clearInterval(interval);
  }, []);

  const filteredLogs = logs.filter(log => {
    const matchesCategory = !filter || log.category.toLowerCase().includes(filter.toLowerCase());
    const matchesLevel = !levelFilter || log.level === levelFilter;
    return matchesCategory && matchesLevel;
  });

  const handleCopyLogs = () => {
    const text = debugLogger.exportLogs();
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const errorCount = logs.filter(l => l.level === 'error').length;
  const warnCount = logs.filter(l => l.level === 'warn').length;

  return (
    <div className="fixed bottom-4 right-4 w-96 max-h-96 z-[9999] flex flex-col">
      <Card className="border-2 border-orange-500 bg-background shadow-2xl">
        <CardHeader className="pb-3 border-b flex flex-row items-center justify-between bg-gradient-to-r from-orange-500/10 to-red-500/10">
          <div className="flex-1">
            <CardTitle className="text-sm font-mono">
              🐛 Debug Panel
              {errorCount > 0 && <span className="ml-2 text-red-500">({errorCount} errors)</span>}
              {warnCount > 0 && <span className="ml-2 text-yellow-500">({warnCount} warnings)</span>}
            </CardTitle>
          </div>
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0 hover:bg-red-500/20"
            onClick={() => {
              debugLogger.clearLogs();
              setLogs([]);
            }}
            title="Clear logs"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0"
            onClick={onClose}
            title="Close debug panel"
          >
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>

        <CardContent className="p-3 space-y-2">
          {/* Filters */}
          <div className="flex gap-2 flex-wrap">
            <input
              type="text"
              placeholder="Filter category..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="flex-1 min-w-32 px-2 py-1 text-xs border rounded bg-background"
            />
            <select
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value)}
              className="px-2 py-1 text-xs border rounded bg-background"
            >
              <option value="">All Levels</option>
              <option value="error">Error</option>
              <option value="warn">Warn</option>
              <option value="info">Info</option>
              <option value="success">Success</option>
              <option value="debug">Debug</option>
            </select>
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2 text-xs gap-1"
              onClick={handleCopyLogs}
            >
              <Copy className="h-3 w-3" />
              {copied ? 'Copied!' : 'Copy'}
            </Button>
          </div>

          {/* Logs */}
          <div className="max-h-64 overflow-y-auto border rounded bg-black/40 p-2 font-mono text-xs space-y-1">
            {filteredLogs.length === 0 ? (
              <div className="text-muted-foreground italic">No logs to display</div>
            ) : (
              filteredLogs.map((log, idx) => (
                <div
                  key={idx}
                  className={`text-xs py-0.5 px-1 rounded flex gap-2 ${getLogColor(log.level)}`}
                >
                  <span className="flex-shrink-0 font-bold w-6">{log.level[0].toUpperCase()}</span>
                  <span className="flex-shrink-0 text-gray-400 w-16">{log.category}</span>
                  <span className="flex-1 text-left">{log.message}</span>
                  <span className="flex-shrink-0 text-gray-500 text-[10px]">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              ))
            )}
          </div>

          {/* Stats */}
          <div className="text-xs text-muted-foreground border-t pt-2 flex justify-between">
            <span>Total logs: {logs.length}</span>
            <span>Filtered: {filteredLogs.length}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function getLogColor(level: string): string {
  const colors: Record<string, string> = {
    error: 'bg-red-500/20 text-red-200 border border-red-500/30',
    warn: 'bg-yellow-500/20 text-yellow-200 border border-yellow-500/30',
    info: 'bg-blue-500/20 text-blue-200 border border-blue-500/30',
    success: 'bg-green-500/20 text-green-200 border border-green-500/30',
    debug: 'bg-gray-500/20 text-gray-300 border border-gray-500/30',
  };
  return colors[level] || 'text-foreground';
}
