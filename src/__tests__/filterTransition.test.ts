import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { startAnimation, isAnimating } from '../render/animationLoop';

describe('filter transition animation pattern', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('interpolates transitionOpacity from start to target over duration', () => {
    let rafId = 0;
    const rafCallbacks: FrameRequestCallback[] = [];
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      rafCallbacks.push(cb);
      return ++rafId;
    });
    vi.stubGlobal('cancelAnimationFrame', vi.fn());

    const node = { transitionOpacity: undefined as number | undefined };
    const startAlpha = 1.0;
    const targetAlpha = 0.18;

    startAnimation({
      id: 'filter-transition',
      duration: 300,
      onFrame: (progress) => {
        node.transitionOpacity = startAlpha + (targetAlpha - startAlpha) * progress;
      },
      onComplete: () => {
        node.transitionOpacity = undefined;
      },
    });

    const start = performance.now();
    rafCallbacks.shift()!(start);
    expect(node.transitionOpacity).toBe(1.0);

    rafCallbacks.shift()!(start + 150);
    expect(node.transitionOpacity).toBeGreaterThan(targetAlpha);
    expect(node.transitionOpacity).toBeLessThan(startAlpha);

    rafCallbacks.shift()!(start + 300);
    expect(node.transitionOpacity).toBeUndefined();

    vi.unstubAllGlobals();
  });

  it('handles mid-animation restart from current alpha', () => {
    let rafId = 0;
    const rafCallbacks: FrameRequestCallback[] = [];
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      rafCallbacks.push(cb);
      return ++rafId;
    });
    vi.stubGlobal('cancelAnimationFrame', vi.fn());

    const node = { transitionOpacity: undefined as number | undefined };

    const cancel = startAnimation({
      id: 'filter-transition',
      duration: 300,
      onFrame: (progress) => {
        node.transitionOpacity = 1.0 + (0.18 - 1.0) * progress;
      },
    });

    const start = performance.now();
    rafCallbacks.shift()!(start);
    rafCallbacks.shift()!(start + 150);
    const midAlpha = node.transitionOpacity!;
    expect(midAlpha).toBeGreaterThan(0.18);
    expect(midAlpha).toBeLessThan(1.0);

    cancel();
    startAnimation({
      id: 'filter-transition',
      duration: 300,
      onFrame: (progress) => {
        node.transitionOpacity = midAlpha + (1.0 - midAlpha) * progress;
      },
    });

    rafCallbacks.shift()!(start + 150);
    expect(node.transitionOpacity).toBeCloseTo(midAlpha, 1);

    vi.unstubAllGlobals();
  });
});
