/**
 * Helper Functions Tests
 */

import { describe, it, expect } from 'vitest';
import {
  PI,
  TAU,
  mod,
  sq,
  isInteger,
  clamp,
  lerp,
  distance,
  toRadians,
  toDegrees
} from '../utils/helpers.js';

describe('Constants', () => {
  it('should define PI correctly', () => {
    expect(PI).toBe(Math.PI);
  });

  it('should define TAU as 2*PI', () => {
    expect(TAU).toBe(Math.PI * 2);
  });
});

describe('mod', () => {
  it('should handle positive numbers', () => {
    expect(mod(7, 5)).toBe(2);
    expect(mod(10, 3)).toBe(1);
  });

  it('should handle negative numbers correctly', () => {
    // JavaScript % returns -1 for -1 % 5, but mod should return 4
    expect(mod(-1, 5)).toBe(4);
    expect(mod(-7, 5)).toBe(3);
  });

  it('should handle zero', () => {
    expect(mod(0, 5)).toBe(0);
  });
});

describe('sq', () => {
  it('should square positive numbers', () => {
    expect(sq(3)).toBe(9);
    expect(sq(5)).toBe(25);
  });

  it('should square negative numbers', () => {
    expect(sq(-3)).toBe(9);
  });

  it('should handle zero', () => {
    expect(sq(0)).toBe(0);
  });
});

describe('isInteger', () => {
  it('should return true for digit strings', () => {
    expect(isInteger('123')).toBe(true);
    expect(isInteger('0')).toBe(true);
  });

  it('should return false for non-digit strings', () => {
    expect(isInteger('12.3')).toBe(false);
    expect(isInteger('abc')).toBe(false);
    expect(isInteger('-5')).toBe(false);
  });

  it('should return false for empty string', () => {
    expect(isInteger('')).toBe(false);
  });
});

describe('clamp', () => {
  it('should return value when within range', () => {
    expect(clamp(5, 0, 10)).toBe(5);
  });

  it('should return min when value is below range', () => {
    expect(clamp(-5, 0, 10)).toBe(0);
  });

  it('should return max when value is above range', () => {
    expect(clamp(15, 0, 10)).toBe(10);
  });

  it('should handle edge cases', () => {
    expect(clamp(0, 0, 10)).toBe(0);
    expect(clamp(10, 0, 10)).toBe(10);
  });
});

describe('lerp', () => {
  it('should return start value at t=0', () => {
    expect(lerp(0, 100, 0)).toBe(0);
  });

  it('should return end value at t=1', () => {
    expect(lerp(0, 100, 1)).toBe(100);
  });

  it('should interpolate correctly', () => {
    expect(lerp(0, 100, 0.5)).toBe(50);
    expect(lerp(0, 100, 0.25)).toBe(25);
  });

  it('should handle negative values', () => {
    expect(lerp(-100, 100, 0.5)).toBe(0);
  });
});

describe('distance', () => {
  it('should calculate distance between two points', () => {
    expect(distance(0, 0, 3, 4)).toBe(5); // 3-4-5 triangle
    expect(distance(0, 0, 0, 0)).toBe(0);
  });

  it('should handle negative coordinates', () => {
    expect(distance(-3, -4, 0, 0)).toBe(5);
  });
});

describe('toRadians and toDegrees', () => {
  it('should convert degrees to radians', () => {
    expect(toRadians(180)).toBeCloseTo(Math.PI);
    expect(toRadians(90)).toBeCloseTo(Math.PI / 2);
    expect(toRadians(0)).toBe(0);
  });

  it('should convert radians to degrees', () => {
    expect(toDegrees(Math.PI)).toBeCloseTo(180);
    expect(toDegrees(Math.PI / 2)).toBeCloseTo(90);
    expect(toDegrees(0)).toBe(0);
  });

  it('should be inverse operations', () => {
    expect(toDegrees(toRadians(45))).toBeCloseTo(45);
    expect(toRadians(toDegrees(Math.PI))).toBeCloseTo(Math.PI);
  });
});
