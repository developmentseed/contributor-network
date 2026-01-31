/**
 * Debug Utilities
 *
 * Conditional logging and debugging helpers.
 * Debug output is controlled by localStorage flag 'debug-orca'.
 *
 * @module utils/debug
 */

/**
 * Check if debug mode is enabled.
 *
 * @returns {boolean} True if debug mode is enabled
 */
export function isDebugEnabled() {
  try {
    return localStorage.getItem('debug-orca') === 'true';
  } catch {
    // localStorage may not be available (SSR, etc.)
    return false;
  }
}

/**
 * Enable debug mode.
 */
export function enableDebug() {
  try {
    localStorage.setItem('debug-orca', 'true');
    console.log('🔧 Debug mode enabled. Refresh to see debug output.');
  } catch {
    console.warn('Could not enable debug mode (localStorage unavailable)');
  }
}

/**
 * Disable debug mode.
 */
export function disableDebug() {
  try {
    localStorage.removeItem('debug-orca');
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
function getTimestamp() {
  return new Date().toISOString().substr(11, 8);
}

/**
 * Conditional debug logging.
 * Only outputs when debug mode is enabled via localStorage.
 *
 * @param {string} message - The message to log
 * @param {Object} data - Optional data to include
 */
export function debugLog(message, data = {}) {
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
export function debugWarn(message, data = {}) {
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
export function debugError(message, data = {}) {
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
export function debugGroup(label, fn) {
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
export function debugTime(label, fn) {
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
export function createLogger(scope) {
  const prefix = `[${scope}]`;

  return {
    log: (message, data = {}) => debugLog(`${prefix} ${message}`, data),
    warn: (message, data = {}) => debugWarn(`${prefix} ${message}`, data),
    error: (message, data = {}) => debugError(`${prefix} ${message}`, data),
    group: (label, fn) => debugGroup(`${prefix} ${label}`, fn),
    time: (label, fn) => debugTime(`${prefix} ${label}`, fn)
  };
}
