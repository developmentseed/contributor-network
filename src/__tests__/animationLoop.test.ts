import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { startAnimation, isAnimating } from '../render/animationLoop';

describe('animationLoop', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('calls onFrame with increasing progress', () => {
    const frames: number[] = [];
    let rafId = 0;
    const rafCallbacks: FrameRequestCallback[] = [];
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      rafCallbacks.push(cb);
      return ++rafId;
    });
    vi.stubGlobal('cancelAnimationFrame', vi.fn());

    startAnimation({
      id: 'test',
      duration: 100,
      onFrame: (progress) => frames.push(progress),
    });

    // Simulate frames at 0ms, 50ms, 100ms
    const start = performance.now();
    rafCallbacks.shift()!(start);
    rafCallbacks.shift()!(start + 50);
    rafCallbacks.shift()!(start + 100);

    expect(frames.length).toBe(3);
    expect(frames[0]).toBe(0);
    expect(frames[frames.length - 1]).toBe(1);
    expect(frames[1]).toBeGreaterThan(0);
    expect(frames[1]).toBeLessThan(1);

    vi.unstubAllGlobals();
  });

  it('calls onComplete when animation finishes', () => {
    const onComplete = vi.fn();
    let rafId = 0;
    const rafCallbacks: FrameRequestCallback[] = [];
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      rafCallbacks.push(cb);
      return ++rafId;
    });
    vi.stubGlobal('cancelAnimationFrame', vi.fn());

    startAnimation({
      id: 'test',
      duration: 100,
      onFrame: vi.fn(),
      onComplete,
    });

    const start = performance.now();
    rafCallbacks.shift()!(start);
    expect(onComplete).not.toHaveBeenCalled();
    rafCallbacks.shift()!(start + 100);
    expect(onComplete).toHaveBeenCalledOnce();

    vi.unstubAllGlobals();
  });

  it('cancel stops the animation', () => {
    const onFrame = vi.fn();
    let rafId = 0;
    const rafCallbacks: FrameRequestCallback[] = [];
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      rafCallbacks.push(cb);
      return ++rafId;
    });
    vi.stubGlobal('cancelAnimationFrame', vi.fn());

    const cancel = startAnimation({
      id: 'test',
      duration: 1000,
      onFrame,
    });

    const start = performance.now();
    rafCallbacks.shift()!(start);
    expect(onFrame).toHaveBeenCalledTimes(1);

    cancel();

    // Even if rAF fires again, onFrame should not be called
    if (rafCallbacks.length > 0) {
      rafCallbacks.shift()!(start + 50);
    }
    expect(onFrame).toHaveBeenCalledTimes(1);

    vi.unstubAllGlobals();
  });

  it('isAnimating reflects active state', () => {
    let rafId = 0;
    const rafCallbacks: FrameRequestCallback[] = [];
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      rafCallbacks.push(cb);
      return ++rafId;
    });
    vi.stubGlobal('cancelAnimationFrame', vi.fn());

    expect(isAnimating()).toBe(false);

    startAnimation({
      id: 'test',
      duration: 100,
      onFrame: vi.fn(),
    });

    expect(isAnimating()).toBe(true);

    const start = performance.now();
    rafCallbacks.shift()!(start);
    rafCallbacks.shift()!(start + 100);

    expect(isAnimating()).toBe(false);

    vi.unstubAllGlobals();
  });

  it('supports concurrent animations', () => {
    const framesA: number[] = [];
    const framesB: number[] = [];
    let rafId = 0;
    const rafCallbacks: FrameRequestCallback[] = [];
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      rafCallbacks.push(cb);
      return ++rafId;
    });
    vi.stubGlobal('cancelAnimationFrame', vi.fn());

    startAnimation({
      id: 'a',
      duration: 100,
      onFrame: (p) => framesA.push(p),
    });
    startAnimation({
      id: 'b',
      duration: 200,
      onFrame: (p) => framesB.push(p),
    });

    expect(isAnimating()).toBe(true);

    const start = performance.now();
    // First rAF fires both
    rafCallbacks.shift()!(start);
    expect(framesA.length).toBe(1);
    expect(framesB.length).toBe(1);

    // At 100ms: A completes, B continues
    rafCallbacks.shift()!(start + 100);
    expect(framesA.length).toBe(2);
    expect(framesA[1]).toBe(1);
    expect(isAnimating()).toBe(true); // B still running

    // At 200ms: B completes
    rafCallbacks.shift()!(start + 200);
    expect(framesB[framesB.length - 1]).toBe(1);
    expect(isAnimating()).toBe(false);

    vi.unstubAllGlobals();
  });
});
