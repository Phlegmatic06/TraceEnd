// ──────────────────────────────────────────────────────────────
// TraceEnd — Logging Abstraction
// Structured logging that can be swapped to a production service
// (Pino, Winston, Datadog, etc.) without changing call sites.
// ──────────────────────────────────────────────────────────────

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: unknown;
}

interface Logger {
  debug(message: string, context?: LogContext): void;
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, context?: LogContext): void;
  child(context: LogContext): Logger;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

function getMinLevel(): LogLevel {
  if (typeof process !== 'undefined' && process.env.NODE_ENV === 'production') {
    return 'info';
  }
  return 'debug';
}

function createLogger(baseContext: LogContext = {}): Logger {
  const minLevel = getMinLevel();

  function log(level: LogLevel, message: string, context?: LogContext) {
    if (LOG_LEVELS[level] < LOG_LEVELS[minLevel]) return;

    const entry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...baseContext,
      ...context,
    };

    switch (level) {
      case 'error':
        console.error(JSON.stringify(entry));
        break;
      case 'warn':
        console.warn(JSON.stringify(entry));
        break;
      default:
        console.log(JSON.stringify(entry));
    }
  }

  return {
    debug: (msg, ctx?) => log('debug', msg, ctx),
    info: (msg, ctx?) => log('info', msg, ctx),
    warn: (msg, ctx?) => log('warn', msg, ctx),
    error: (msg, ctx?) => log('error', msg, ctx),
    child: (ctx) => createLogger({ ...baseContext, ...ctx }),
  };
}

export const logger = createLogger({ service: 'traceend' });

export type { Logger, LogContext };
