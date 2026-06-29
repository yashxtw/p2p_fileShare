/**
 * Logger utility for structured logging.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: string;
  data?: Record<string, unknown>;
  error?: {
    message: string;
    stack?: string;
    code?: string;
  };
}

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

export function createLogger(context: string, minLevel: LogLevel = 'info') {
  const isProduction = process.env.NODE_ENV === 'production';
  const minPriority = LOG_LEVEL_PRIORITY[minLevel];
  function formatEntry(entry: LogEntry): string {
    if (isProduction) {
      return JSON.stringify(entry);
    }
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${entry.level.toUpperCase()}] [${entry.context}]`;
    let output = `${prefix} ${entry.message}`;
    if (entry.data) {
      output += `\n  data: ${JSON.stringify(entry.data, null, 2)}`;
    }
    if (entry.error) {
      output += `\n  error: ${entry.error.message}`;
      if (entry.error.stack) {
        output += `\n  stack: ${entry.error.stack}`;
      }
    }
    return output;
  }

  function log(level: LogLevel, message: string, data?: Record<string, unknown>) {
    if (LOG_LEVEL_PRIORITY[level] < minPriority) return;
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      context,
      data,
    };
    const formatted = formatEntry(entry);
    switch (level) {
      case 'error':
        console.error(formatted);
        break;
      case 'warn':
        console.warn(formatted);
        break;
      default:
        // eslint-disable-next-line no-console
        console.log(formatted);
    }
  }
  
  return {
    debug: (message: string, data?: Record<string, unknown>) => log('debug', message, data),
    info: (message: string, data?: Record<string, unknown>) => log('info', message, data),
    warn: (message: string, data?: Record<string, unknown>) => log('warn', message, data),
    error: (message: string, error?: Error, data?: Record<string, unknown>) => {
      const entry: LogEntry = {
        level: 'error',
        message,
        timestamp: new Date().toISOString(),
        context,
        data,
        error: error
          ? {
              message: error.message,
              stack: error.stack,
              code: (error as { code?: string }).code,
            }
          : undefined,
      };
      console.error(formatEntry(entry));
    },
  };
}
