/**
 * Formatting Utilities
 *
 * Date and number formatting functions for the visualization.
 * Wraps D3 formatters for consistent use across the codebase.
 *
 * @module utils/formatters
 */

import * as d3 from 'd3';

/**
 * Date format patterns used in the visualization.
 */
export const DATE_FORMATS: Record<string, string> = {
  iso: '%Y-%m-%dT%H:%M:%SZ',
  unix: '%s',
  short: '%b %Y',
  full: '%b %d, %Y'
};

interface DateFormatters {
  parseDate: (dateStr: string) => Date | null;
  parseDateUnix: (timestamp: string) => Date | null;
  formatDate: (date: Date) => string;
  formatDateExact: (date: Date) => string;
}

interface NumberFormatters {
  formatDigit: (value: number) => string;
  formatComma: (value: number) => string;
  formatPercent: (value: number) => string;
  formatFixed: (decimals: number) => (value: number) => string;
}

/**
 * Create date parsing and formatting functions.
 *
 * @returns {Object} Object containing date functions
 */
export function createDateFormatters(): DateFormatters {
  return {
    /**
     * Parse ISO date string to Date object.
     * @param {string} dateStr - ISO date string
     * @returns {Date|null} Parsed date or null
     */
    parseDate: d3.timeParse(DATE_FORMATS.iso) as (dateStr: string) => Date | null,

    /**
     * Parse Unix timestamp to Date object.
     * @param {string} timestamp - Unix timestamp
     * @returns {Date|null} Parsed date or null
     */
    parseDateUnix: d3.timeParse(DATE_FORMATS.unix) as (timestamp: string) => Date | null,

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
 * @returns {Object} Object containing number functions
 */
export function createNumberFormatters(): NumberFormatters {
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
    formatFixed: (decimals: number) => d3.format(`.${decimals}f`)
  };
}

/**
 * Create all formatters.
 *
 * @returns {Object} Object containing all formatters
 */
export function createFormatters(): DateFormatters & NumberFormatters {
  return {
    ...createDateFormatters(),
    ...createNumberFormatters()
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
export function formatDateRange(start: Date | null, end: Date | null, formatFn: (date: Date) => string): string {
  if (!start || !end) return '';
  return `${formatFn(start)} – ${formatFn(end)}`;
}

/**
 * Format a number of commits with appropriate suffix.
 *
 * @param {number} count - Number of commits
 * @returns {string} Formatted commit count
 */
export function formatCommitCount(count: number): string {
  if (count === 1) return '1 commit';
  return `${count.toLocaleString()} commits`;
}

/**
 * Format a number of repositories with appropriate suffix.
 *
 * @param {number} count - Number of repos
 * @returns {string} Formatted repo count
 */
export function formatRepoCount(count: number): string {
  if (count === 1) return '1 repository';
  return `${count.toLocaleString()} repositories`;
}

/**
 * Format a contributor count with appropriate suffix.
 *
 * @param {number} count - Number of contributors
 * @returns {string} Formatted contributor count
 */
export function formatContributorCount(count: number): string {
  if (count === 1) return '1 contributor';
  return `${count.toLocaleString()} contributors`;
}
