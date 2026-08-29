type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  requestId?: string;
  metadata?: Record<string, unknown>;
}

function formatLog(entry: LogEntry): string {
  const base = `[${entry.timestamp}] [${entry.level.toUpperCase()}] ${entry.message}`;
  const extras: string[] = [];
  if (entry.requestId) extras.push(`requestId=${entry.requestId}`);
  if (entry.metadata) extras.push(JSON.stringify(entry.metadata));
  return extras.length > 0 ? `${base} ${extras.join(' ')}` : base;
}

export const logger = {
  info(message: string, requestId?: string, metadata?: Record<string, unknown>) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: 'info',
      message,
      requestId,
      metadata,
    };
    console.log(formatLog(entry));
  },

  warn(message: string, requestId?: string, metadata?: Record<string, unknown>) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: 'warn',
      message,
      requestId,
      metadata,
    };
    console.warn(formatLog(entry));
  },

  error(message: string, requestId?: string, metadata?: Record<string, unknown>) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: 'error',
      message,
      requestId,
      metadata,
    };
    console.error(formatLog(entry));
  },

  debug(message: string, requestId?: string, metadata?: Record<string, unknown>) {
    if (process.env.NODE_ENV === 'development') {
      const entry: LogEntry = {
        timestamp: new Date().toISOString(),
        level: 'debug',
        message,
        requestId,
        metadata,
      };
      console.debug(formatLog(entry));
    }
  },
};
