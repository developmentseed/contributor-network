/**
 * Debug Utilities
 *
 * Conditional logging and debugging helpers.
 * Debug output is controlled by localStorage flag 'debug-contributor-network'.
 *
 * @module utils/debug
 */

interface ScopedLogger {
  log: (message: string, data?: Record<string, unknown>) => void;
  warn: (message: string, data?: Record<string, unknown>) => void;
  error: (message: string, data?: Record<string, unknown>) => void;
  group: (label: string, fn: () => void) => void;
  time: <T>(label: string, fn: () => T) => T;
}

/**
 * Check if debug mode is enabled.
 *
 * @returns {boolean} True if debug mode is enabled
 */
export function isDebugEnabled(): boolean {
  try {
    return localStorage.getItem('debug-contributor-network') === 'true';
  } catch {
    return false;
  }
}

/**
 * Enable debug mode.
 */
export function enableDebug(): void {
  try {
    localStorage.setItem('debug-contributor-network', 'true');
    console.log('🔧 Debug mode enabled. Refresh to see debug output.');
  } catch {
    console.warn('Could not enable debug mode (localStorage unavailable)');
  }
}

/**
 * Disable debug mode.
 */
export function disableDebug(): void {
  try {
    localStorage.removeItem('debug-contributor-network');
    console.log('Debug mode disabled.');
  } catch {
    console.warn('Could not disable debug mode (localStorage unavailable)');
  }
}

/**
 * Get a formatted timestamp for log messages.
 *
 * @returns {string} HH:MM:SS formatted timestamp
 */
function getTimestamp(): string {
  return new Date().toISOString().substr(11, 8);
}

/**
 * Conditional debug logging.
 * Only outputs when debug mode is enabled via localStorage.
 *
 * @param {string} message - The message to log
 * @param {Object} data - Optional data to include
 */
export function debugLog(message: string, data: Record<string, unknown> = {}): void {
  if (isDebugEnabled()) {
    console.log(`[${getTimestamp()}] ${message}`, data);
  }
}

/**
 * Conditional debug warning.
 * Only outputs when debug mode is enabled via localStorage.
 *
 * @param {string} message - The warning message
 * @param {Object} data - Optional data to include
 */
export function debugWarn(message: string, data: Record<string, unknown> = {}): void {
  if (isDebugEnabled()) {
    console.warn(`[${getTimestamp()}] ⚠️ ${message}`, data);
  }
}

/**
 * Conditional debug error.
 * Only outputs when debug mode is enabled via localStorage.
 *
 * @param {string} message - The error message
 * @param {Object} data - Optional data to include
 */
export function debugError(message: string, data: Record<string, unknown> = {}): void {
  if (isDebugEnabled()) {
    console.error(`[${getTimestamp()}] ❌ ${message}`, data);
  }
}

/**
 * Log a debug group with collapsible content.
 *
 * @param {string} label - Group label
 * @param {Function} fn - Function that performs logging inside the group
 */
export function debugGroup(label: string, fn: () => void): void {
  if (isDebugEnabled()) {
    console.groupCollapsed(`[${getTimestamp()}] ${label}`);
    try {
      fn();
    } finally {
      console.groupEnd();
    }
  }
}

/**
 * Time a function execution and log the duration.
 *
 * @param {string} label - Label for the timing
 * @param {Function} fn - Function to time
 * @returns {*} The return value of the function
 */
export function debugTime<T>(label: string, fn: () => T): T {
  if (isDebugEnabled()) {
    const start = performance.now();
    const result = fn();
    const duration = (performance.now() - start).toFixed(2);
    console.log(`[${getTimestamp()}] ⏱️ ${label}: ${duration}ms`);
    return result;
  }
  return fn();
}

/**
 * Create a scoped logger with a prefix.
 *
 * @param {string} scope - The scope/module name
 * @returns {Object} Object with log, warn, error methods
 */
export function createLogger(scope: string): ScopedLogger {
  const prefix = `[${scope}]`;

  return {
    log: (message: string, data: Record<string, unknown> = {}) => debugLog(`${prefix} ${message}`, data),
    warn: (message: string, data: Record<string, unknown> = {}) => debugWarn(`${prefix} ${message}`, data),
    error: (message: string, data: Record<string, unknown> = {}) => debugError(`${prefix} ${message}`, data),
    group: (label: string, fn: () => void) => debugGroup(`${prefix} ${label}`, fn),
    time: <T>(label: string, fn: () => T): T => debugTime(`${prefix} ${label}`, fn)
  };
}
