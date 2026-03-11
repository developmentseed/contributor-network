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

/**
 * Sets up hover interaction handlers on the canvas
 * @param options - Configuration options for hover behavior
 */
export function setupHover(options: SetupHoverOptions): void {
  const {
    canvasSelector,
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

  const element = document.querySelector(canvasSelector) as Element;
  d3.select(element).on('mousemove', function (this: Element, event: MouseEvent) {
    try {
      let [mx, my] = d3.pointer(event, this);
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
  });

  d3.select(element).on('mouseleave', function () {
    contextHover.clearRect(0, 0, WIDTH, HEIGHT);
    clearHover(interactionState);

    if (!interactionState.clickActive) {
      canvas.style.opacity = '1';
    }
  });
}
