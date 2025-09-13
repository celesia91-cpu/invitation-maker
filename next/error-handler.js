const errorLog = [];

function formatError(error, context = '', level = 'error', details) {
  return {
    level,
    message: error && error.message ? error.message : String(error),
    stack: error && error.stack ? error.stack : undefined,
    context,
    details,
    timestamp: new Date().toISOString()
  };
}

export function logError(error, context = '', details) {
  const entry = formatError(error instanceof Error ? error : new Error(String(error)), context, 'error', details);
  errorLog.push(entry);
  console.error(`[${entry.timestamp}]${context ? ' ' + context + ':' : ''} ${entry.message}`);
  return entry;
}

export function logWarning(warning, context = '', details) {
  const warnErr = warning instanceof Error ? warning : new Error(String(warning));
  const entry = formatError(warnErr, context, 'warn', details);
  errorLog.push(entry);
  console.warn(`[${entry.timestamp}]${context ? ' ' + context + ':' : ''} ${entry.message}`);
  return entry;
}

export function getErrorLog() {
  return [...errorLog];
}

export { formatError };
