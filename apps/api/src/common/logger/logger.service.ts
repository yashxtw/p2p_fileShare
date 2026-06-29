import { Injectable } from '@nestjs/common';

interface LogEntry {
  level: string;
  message: string;
  context?: string;
  timestamp: string;
  data?: Record<string, unknown>;
  error?: {
    message: string;
    stack?: string;
  };
}

@Injectable()
export class LoggerService {
  private readonly isProduction = process.env.NODE_ENV === 'production';
  private formatEntry(entry: LogEntry): string {
    if (this.isProduction) {
      return JSON.stringify(entry);
    }
    const ctx = entry.context ? ` [${entry.context}]` : '';
    let output = `[${entry.timestamp}] [${entry.level}]${ctx} ${entry.message}`;
    if (entry.data) {
      output += `\n  ${JSON.stringify(entry.data)}`;
    }
    if (entry.error) {
      output += `\n  Error: ${entry.error.message}`;
      if (entry.error.stack) {
        output += `\n  ${entry.error.stack}`;
      }
    }
    return output;
  }
  debug(message: string, context?: string, data?: Record<string, unknown>) {
    const entry: LogEntry = {
      level: 'DEBUG',
      message,
      context,
      timestamp: new Date().toISOString(),
      data,
    };
    // eslint-disable-next-line no-console
    console.log(this.formatEntry(entry));
  }
  info(message: string, context?: string, data?: Record<string, unknown>) {
    const entry: LogEntry = {
      level: 'INFO',
      message,
      context,
      timestamp: new Date().toISOString(),
      data,
    };
    // eslint-disable-next-line no-console
    console.log(this.formatEntry(entry));
  }
  warn(message: string, context?: string, data?: Record<string, unknown>) {
    const entry: LogEntry = {
      level: 'WARN',
      message,
      context,
      timestamp: new Date().toISOString(),
      data,
    };
    console.warn(this.formatEntry(entry));
  }
  error(message: string, context?: string, error?: Error, data?: Record<string, unknown>) {
    const entry: LogEntry = {
      level: 'ERROR',
      message,
      context,
      timestamp: new Date().toISOString(),
      data,
      error: error
        ? {
            message: error.message,
            stack: error.stack,
          }
        : undefined,
    };
    console.error(this.formatEntry(entry));
  }
}