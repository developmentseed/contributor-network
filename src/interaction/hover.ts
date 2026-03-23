import * as d3 from 'd3';
import { findNode as findNodeAtPosition } from './findNode';
import { drawWithZoomTransform } from './zoom';
import { isTouchDevice } from '../utils/helpers';
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
      canvas.style.opacity = d.filteredOut ? '0.85' : (d.type === 'contributor' ? '0.15' : '0.3');
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
 * Mouse events are guarded on touch devices to prevent synthetic mouse events
 * from clearing hover state. Touch interaction is handled separately.
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
    if (isTouchDevice()) return;
    const [mx, my] = d3.pointer(event, this);
    handlePointerHover(mx, my, options);
  });

  d3.select(element).on('mouseleave', function () {
    if (isTouchDevice()) return;
    contextHover.clearRect(0, 0, WIDTH, HEIGHT);
    clearHover(interactionState);
    if (!interactionState.clickActive) {
      canvas.style.opacity = '1';
    }
  });
}
