/**
 * Math and General Utility Functions
 *
 * Pure utility functions for mathematical operations and general helpers.
 *
 * @module utils/helpers
 */

/**
 * Mathematical constants
 */
export const PI: number = Math.PI;
export const TAU: number = PI * 2;

/**
 * Modulo operation that handles negative numbers correctly.
 * JavaScript's % operator returns negative results for negative dividends,
 * but this function always returns a positive result.
 *
 * @param {number} x - The dividend
 * @param {number} n - The divisor
 * @returns {number} The positive remainder
 *
 * @example
 * mod(-1, 5) // returns 4, not -1
 * mod(7, 5)  // returns 2
 */
export function mod(x: number, n: number): number {
  return ((x % n) + n) % n;
}

/**
 * Square a number.
 *
 * @param {number} x - The number to square
 * @returns {number} x squared
 */
export function sq(x: number): number {
  return x * x;
}

/**
 * Check if a value is a string containing only digits.
 *
 * @param {*} value - The value to check
 * @returns {boolean} True if the value is a string of digits
 */
export function isInteger(value: string): boolean {
  return /^\d+$/.test(value);
}

/**
 * Clamp a value between a minimum and maximum.
 *
 * @param {number} value - The value to clamp
 * @param {number} min - The minimum value
 * @param {number} max - The maximum value
 * @returns {number} The clamped value
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Linear interpolation between two values.
 *
 * @param {number} a - Start value
 * @param {number} b - End value
 * @param {number} t - Interpolation factor (0-1)
 * @returns {number} Interpolated value
 */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Calculate the distance between two points.
 *
 * @param {number} x1 - First point x
 * @param {number} y1 - First point y
 * @param {number} x2 - Second point x
 * @param {number} y2 - Second point y
 * @returns {number} Distance between points
 */
export function distance(x1: number, y1: number, x2: number, y2: number): number {
  return Math.sqrt(sq(x2 - x1) + sq(y2 - y1));
}

/**
 * Convert degrees to radians.
 *
 * @param {number} degrees - Angle in degrees
 * @returns {number} Angle in radians
 */
export function toRadians(degrees: number): number {
  return degrees * (PI / 180);
}

/**
 * Convert radians to degrees.
 *
 * @param {number} radians - Angle in radians
 * @returns {number} Angle in degrees
 */
export function toDegrees(radians: number): number {
  return radians * (180 / PI);
}

/**
 * Math function shortcuts for cleaner code.
 * These are the same functions but can be imported for concise usage.
 */
export const round: (x: number) => number = Math.round;
export const cos: (x: number) => number = Math.cos;
export const sin: (x: number) => number = Math.sin;
export const min: (...values: number[]) => number = Math.min;
export const max: (...values: number[]) => number = Math.max;
export const sqrt: (x: number) => number = Math.sqrt;
export const abs: (x: number) => number = Math.abs;
export const floor: (x: number) => number = Math.floor;
export const ceil: (x: number) => number = Math.ceil;

/**
 * Returns true if the current device supports touch input.
 */
export function isTouchDevice(): boolean {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}
