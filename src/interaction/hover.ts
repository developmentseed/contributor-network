import * as d3 from 'd3';
import { findNode as findNodeAtPosition } from './findNode';
import { drawWithZoomTransform } from './zoom';
import type {
  VisualizationConfig,
  DelaunayData,
  InteractionState,
  ZoomState,
  VisualizationNode,
} from '../types';

export interface SetupHoverOptions {
  canvasSelector: string;
  config: VisualizationConfig;
  delaunayData: DelaunayData;
  interactionState: InteractionState;
  canvas: HTMLCanvasElement;
  contextHover: CanvasRenderingContext2D;
  setHovered: (state: InteractionState, node: VisualizationNode) => void;
  clearHover: (state: InteractionState) => void;
  drawHoverState: (context: CanvasRenderingContext2D, node: VisualizationNode) => void;
  zoomState?: ZoomState | null;
}

function isTouchDevice(): boolean {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

function handlePointerHover(
  mx: number,
  my: number,
  options: SetupHoverOptions,
): void {
  const {
    config,
    delaunayData,
    interactionState,
    canvas,
    contextHover,
    setHovered,
    clearHover,
    drawHoverState,
  } = options;
  const { WIDTH, HEIGHT } = config;

  try {
    const zoomTransform = options.zoomState?.zoomTransform || null;
    const [d, FOUND] = findNodeAtPosition(
      mx,
      my,
      config,
      delaunayData,
      interactionState,
      zoomTransform,
    );

    if (FOUND && d) {
      setHovered(interactionState, d);
      canvas.style.opacity = d.type === 'contributor' ? '0.15' : '0.3';
      drawWithZoomTransform(contextHover, config, options.zoomState ?? null, () => {
        drawHoverState(contextHover, d);
      });
    } else {
      contextHover.clearRect(0, 0, WIDTH, HEIGHT);
      clearHover(interactionState);
      if (!interactionState.clickActive) {
        canvas.style.opacity = '1';
      }
    }
  } catch (err) {
    console.warn('Hover error:', err);
    contextHover.clearRect(0, 0, WIDTH, HEIGHT);
    clearHover(interactionState);
    if (!interactionState.clickActive) canvas.style.opacity = '1';
  }
}

/**
 * Sets up hover interaction handlers on the canvas.
 * On touch devices, adds touchstart listener so tapping shows the hover/tooltip state.
 */
export function setupHover(options: SetupHoverOptions): void {
  const {
    canvasSelector,
    config,
    interactionState,
    canvas,
    contextHover,
    clearHover,
  } = options;
  const { WIDTH, HEIGHT } = config;

  const element = document.querySelector(canvasSelector) as Element;

  d3.select(element).on('mousemove', function (this: Element, event: MouseEvent) {
    const [mx, my] = d3.pointer(event, this);
    handlePointerHover(mx, my, options);
  });

  d3.select(element).on('mouseleave', function () {
    contextHover.clearRect(0, 0, WIDTH, HEIGHT);
    clearHover(interactionState);
    if (!interactionState.clickActive) {
      canvas.style.opacity = '1';
    }
  });

  if (isTouchDevice()) {
    const canvasEl = element as HTMLElement;
    canvasEl.addEventListener(
      'touchstart',
      (event: TouchEvent) => {
        if (event.touches.length !== 1) return;
        const touch = event.touches[0];
        const rect = canvasEl.getBoundingClientRect();
        const mx = touch.clientX - rect.left;
        const my = touch.clientY - rect.top;
        handlePointerHover(mx, my, options);
      },
      { passive: true },
    );
  }
}
