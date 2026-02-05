/**
 * Formatting Utilities
 *
 * Date and number formatting functions for the visualization.
 * Wraps D3 formatters for consistent use across the codebase.
 *
 * @module utils/formatters
 */

/**
 * Date format patterns used in the visualization.
 */
export const DATE_FORMATS = {
  iso: '%Y-%m-%dT%H:%M:%SZ',
  unix: '%s',
  short: '%b %Y',
  full: '%b %d, %Y'
};

/**
 * Create date parsing and formatting functions.
 *
 * @param {Object} d3 - D3 library reference
 * @returns {Object} Object containing date functions
 */
export function createDateFormatters(d3) {
  return {
    /**
     * Parse ISO date string to Date object.
     * @param {string} dateStr - ISO date string
     * @returns {Date|null} Parsed date or null
     */
    parseDate: d3.timeParse(DATE_FORMATS.iso),

    /**
     * Parse Unix timestamp to Date object.
     * @param {string} timestamp - Unix timestamp
     * @returns {Date|null} Parsed date or null
     */
    parseDateUnix: d3.timeParse(DATE_FORMATS.unix),

    /**
     * Format date as "Mon YYYY".
     * @param {Date} date - Date to format
     * @returns {string} Formatted date
     */
    formatDate: d3.timeFormat(DATE_FORMATS.short),

    /**
     * Format date as "Mon DD, YYYY".
     * @param {Date} date - Date to format
     * @returns {string} Formatted date
     */
    formatDateExact: d3.timeFormat(DATE_FORMATS.full)
  };
}

/**
 * Create number formatting functions.
 *
 * @param {Object} d3 - D3 library reference
 * @returns {Object} Object containing number functions
 */
export function createNumberFormatters(d3) {
  return {
    /**
     * Format number with SI prefix (k, M, etc.).
     * @param {number} value - Number to format
     * @returns {string} Formatted number
     */
    formatDigit: d3.format(',.2s'),

    /**
     * Format number with commas.
     * @param {number} value - Number to format
     * @returns {string} Formatted number
     */
    formatComma: d3.format(','),

    /**
     * Format number as percentage.
     * @param {number} value - Number to format (0-1)
     * @returns {string} Formatted percentage
     */
    formatPercent: d3.format('.0%'),

    /**
     * Format number with fixed decimal places.
     * @param {number} decimals - Number of decimal places
     * @returns {Function} Formatter function
     */
    formatFixed: (decimals) => d3.format(`.${decimals}f`)
  };
}

/**
 * Create all formatters.
 *
 * @param {Object} d3 - D3 library reference
 * @returns {Object} Object containing all formatters
 */
export function createFormatters(d3) {
  return {
    ...createDateFormatters(d3),
    ...createNumberFormatters(d3)
  };
}

/**
 * Format a time range as a readable string.
 *
 * @param {Date} start - Start date
 * @param {Date} end - End date
 * @param {Function} formatFn - Date format function
 * @returns {string} Formatted range
 */
export function formatDateRange(start, end, formatFn) {
  if (!start || !end) return '';
  return `${formatFn(start)} – ${formatFn(end)}`;
}

/**
 * Format a number of commits with appropriate suffix.
 *
 * @param {number} count - Number of commits
 * @returns {string} Formatted commit count
 */
export function formatCommitCount(count) {
  if (count === 1) return '1 commit';
  return `${count.toLocaleString()} commits`;
}

/**
 * Format a number of repositories with appropriate suffix.
 *
 * @param {number} count - Number of repos
 * @returns {string} Formatted repo count
 */
export function formatRepoCount(count) {
  if (count === 1) return '1 repository';
  return `${count.toLocaleString()} repositories`;
}

/**
 * Format a contributor count with appropriate suffix.
 *
 * @param {number} count - Number of contributors
 * @returns {string} Formatted contributor count
 */
export function formatContributorCount(count) {
  if (count === 1) return '1 contributor';
  return `${count.toLocaleString()} contributors`;
}
