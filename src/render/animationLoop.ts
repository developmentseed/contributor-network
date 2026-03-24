export interface Animation {
  id: string;
  duration: number;
  onFrame: (progress: number) => void;
  onComplete?: () => void;
}

interface ActiveAnimation {
  animation: Animation;
  startTime: number | null;
  cancelled: boolean;
}

const activeAnimations: Map<string, ActiveAnimation> = new Map();
let rafHandle: number | null = null;

function easeOut(t: number): number {
  return 1 - (1 - t) * (1 - t);
}

function tick(timestamp: number): void {
  for (const [id, entry] of activeAnimations) {
    if (entry.cancelled) {
      activeAnimations.delete(id);
      continue;
    }

    if (entry.startTime === null) {
      entry.startTime = timestamp;
    }

    const elapsed = timestamp - entry.startTime;
    const rawProgress = Math.min(elapsed / entry.animation.duration, 1);
    const easedProgress = easeOut(rawProgress);

    entry.animation.onFrame(easedProgress);

    if (rawProgress >= 1) {
      activeAnimations.delete(id);
      entry.animation.onComplete?.();
    }
  }

  if (activeAnimations.size > 0) {
    rafHandle = requestAnimationFrame(tick);
  } else {
    rafHandle = null;
  }
}

export function startAnimation(animation: Animation): () => void {
  const existing = activeAnimations.get(animation.id);
  if (existing) {
    existing.cancelled = true;
  }

  const entry: ActiveAnimation = {
    animation,
    startTime: null,
    cancelled: false,
  };

  activeAnimations.set(animation.id, entry);

  if (rafHandle === null) {
    rafHandle = requestAnimationFrame(tick);
  }

  return () => {
    entry.cancelled = true;
    activeAnimations.delete(animation.id);
  };
}

export function isAnimating(): boolean {
  return activeAnimations.size > 0;
}
