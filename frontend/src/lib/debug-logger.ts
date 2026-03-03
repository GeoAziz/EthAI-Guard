/**
 * Debug Logger for Development & Troubleshooting
 * Enable via ?debug=1 query parameter or localStorage.setItem('DEBUG_MODE', '1')
 * View logs at ?debug=1&show-logs=1
 */

export interface DebugLog {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug' | 'success';
  category: string;
  message: string;
  data?: any;
  stack?: string;
}

class DebugLogger {
  private logs: DebugLog[] = [];
  private maxLogs = 500;
  private isEnabled = false;
  private isDev = false;

  constructor() {
    this.isDev = process.env.NODE_ENV === 'development';
    this.initializeDebugMode();
  }

  private initializeDebugMode() {
    if (typeof window === 'undefined') return;

    // Check query parameter or localStorage
    const queryParams = new URLSearchParams(window.location.search);
    const debugParam = queryParams.get('debug');
    const localStorageDebug = localStorage?.getItem('DEBUG_MODE');

    this.isEnabled = debugParam === '1' || localStorageDebug === '1' || this.isDev;

    if (this.isEnabled) {
      console.log('[DEBUG_LOGGER] Debug mode enabled');
    }
  }

  private formatTimestamp(): string {
    const now = new Date();
    return now.toISOString();
  }

  private addLog(log: DebugLog) {
    this.logs.push(log);

    // Keep logs array size bounded
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Also log to console for development
    if (this.isEnabled) {
      const style = this.getConsoleStyle(log.level);
      console.log(
        `%c[${log.level.toUpperCase()}:${log.category}] ${log.message}`,
        style,
        log.data
      );
    }
  }

  private getConsoleStyle(level: string): string {
    const styles: Record<string, string> = {
      error: 'color: #ff4444; font-weight: bold;',
      warn: 'color: #ffaa00; font-weight: bold;',
      info: 'color: #4488ff; font-weight: bold;',
      debug: 'color: #888888;',
      success: 'color: #00aa44; font-weight: bold;',
    };
    return styles[level] || '';
  }

  public info(category: string, message: string, data?: any) {
    this.addLog({
      timestamp: this.formatTimestamp(),
      level: 'info',
      category,
      message,
      data,
    });
  }

  public warn(category: string, message: string, data?: any) {
    this.addLog({
      timestamp: this.formatTimestamp(),
      level: 'warn',
      category,
      message,
      data,
    });
  }

  public error(category: string, message: string, error?: any) {
    this.addLog({
      timestamp: this.formatTimestamp(),
      level: 'error',
      category,
      message,
      data: error?.message || error,
      stack: error?.stack,
    });
  }

  public debug(category: string, message: string, data?: any) {
    if (!this.isEnabled && !this.isDev) return;
    
    this.addLog({
      timestamp: this.formatTimestamp(),
      level: 'debug',
      category,
      message,
      data,
    });
  }

  public success(category: string, message: string, data?: any) {
    this.addLog({
      timestamp: this.formatTimestamp(),
      level: 'success',
      category,
      message,
      data,
    });
  }

  public getLogs(): DebugLog[] {
    return [...this.logs];
  }

  public clearLogs() {
    this.logs = [];
  }

  public getLogsByCategory(category: string): DebugLog[] {
    return this.logs.filter(log => log.category === category);
  }

  public getLogsByLevel(level: string): DebugLog[] {
    return this.logs.filter(log => log.level === level);
  }

  public enable() {
    this.isEnabled = true;
    localStorage.setItem('DEBUG_MODE', '1');
  }

  public disable() {
    this.isEnabled = false;
    localStorage.removeItem('DEBUG_MODE');
  }

  public isDebugMode(): boolean {
    return this.isEnabled;
  }

  public exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }
}

// Create singleton instance
export const debugLogger = new DebugLogger();

// Expose to window for console access
if (typeof window !== 'undefined') {
  (window as any).debugLogger = debugLogger;
}
