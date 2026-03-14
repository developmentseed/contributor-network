import * as d3 from 'd3';
import type { ZoomState, VisualizationConfig } from '../types';

export interface SetupZoomOptions {
  canvasSelector: string;
  state: ZoomState;
  redrawAll: () => void;
  ZOOM_CLICK_SUPPRESS_MS?: number;
}

/**
 * Creates and configures zoom behavior for the visualization
 * @param options - Configuration options
 * @returns Zoom behavior object
 */
export function setupZoom(
  options: SetupZoomOptions,
): d3.ZoomBehavior<Element, unknown> {
  const { canvasSelector, state, redrawAll, ZOOM_CLICK_SUPPRESS_MS = 150 } = options;

  state.zoomTransform = d3.zoomIdentity;
  state.zoomPanning = false;
  state.zoomLastInteraction = 0;
  state.zoomMoved = false;
  state.zoomMovedAt = 0;
  state.zoomStartTransform = d3.zoomIdentity;

  const isMobile = window.innerWidth <= 768;
  const zoomBehavior = d3
    .zoom()
    .filter((event: Event) => event.type !== 'wheel' && event.type !== 'dblclick')
    .scaleExtent(isMobile ? [0.6, 3] : [0.4, 6])
    .on('start', () => {
      state.zoomPanning = true;
      state.zoomMoved = false;
      state.zoomStartTransform = state.zoomTransform;
    })
    .on('zoom', (event: d3.D3ZoomEvent<Element, unknown>) => {
      state.zoomTransform = event.transform;
      state.zoomLastInteraction = Date.now();
      if (
        state.zoomTransform.k !== state.zoomStartTransform.k ||
        state.zoomTransform.x !== state.zoomStartTransform.x ||
        state.zoomTransform.y !== state.zoomStartTransform.y
      ) {
        state.zoomMoved = true;
      }
      redrawAll();
    })
    .on('end', () => {
      state.zoomPanning = false;
      state.zoomLastInteraction = Date.now();
      if (state.zoomMoved) state.zoomMovedAt = state.zoomLastInteraction;
    });

  const zoomTarget = d3.select(canvasSelector);
  zoomTarget.call(zoomBehavior as any);

  const canvasElement = document.querySelector(canvasSelector);
  if (!canvasElement) {
    console.warn('setupZoom: canvas element not found:', canvasSelector);
    return zoomBehavior;
  }

  function getZoomCenter(): [number, number] {
    const rect = canvasElement!.getBoundingClientRect();
    return [rect.width / 2, rect.height / 2];
  }

  const zoomInBtn = document.getElementById('zoom-in');
  const zoomOutBtn = document.getElementById('zoom-out');
  const zoomResetBtn = document.getElementById('zoom-reset');

  if (zoomInBtn) {
    zoomInBtn.onclick = () => {
      zoomTarget
        .transition()
        .duration(150)
        .call(zoomBehavior.scaleBy as any, 1.2, getZoomCenter());
    };
  }

  if (zoomOutBtn) {
    zoomOutBtn.onclick = () => {
      zoomTarget
        .transition()
        .duration(150)
        .call(zoomBehavior.scaleBy as any, 1 / 1.2, getZoomCenter());
    };
  }

  if (zoomResetBtn) {
    zoomResetBtn.onclick = () => {
      zoomTarget
        .transition()
        .duration(150)
        .call(zoomBehavior.transform as any, d3.zoomIdentity);
    };
  }

  return zoomBehavior;
}

/**
 * Applies zoom transform to a canvas context
 * @param context - Canvas 2D context
 * @param zoomTransform - D3 zoom transform object
 * @param PIXEL_RATIO - Device pixel ratio
 * @param WIDTH - Canvas width
 * @param HEIGHT - Canvas height
 */
export function applyZoomTransform(
  context: CanvasRenderingContext2D,
  zoomTransform: d3.ZoomTransform,
  PIXEL_RATIO: number,
  WIDTH: number,
  HEIGHT: number,
): void {
  context.translate(zoomTransform.x * PIXEL_RATIO, zoomTransform.y * PIXEL_RATIO);
  context.scale(zoomTransform.k, zoomTransform.k);
  context.translate(WIDTH / 2, HEIGHT / 2);
}

/**
 * Checks if a click should be suppressed due to recent zoom/pan activity
 * @param zoomState - Zoom state object
 * @param ZOOM_CLICK_SUPPRESS_MS - Milliseconds to suppress clicks after zoom/pan
 * @returns True if click should be suppressed
 */
export function shouldSuppressClick(
  zoomState: ZoomState,
  ZOOM_CLICK_SUPPRESS_MS: number = 150,
): boolean {
  return (
    zoomState.zoomPanning ||
    (zoomState.zoomMoved && Date.now() - zoomState.zoomMovedAt < ZOOM_CLICK_SUPPRESS_MS)
  );
}

/**
 * Transforms mouse coordinates to account for zoom transform
 * @param mx - Mouse x coordinate
 * @param my - Mouse y coordinate
 * @param PIXEL_RATIO - Device pixel ratio
 * @param zoomTransform - D3 zoom transform object
 * @param WIDTH - Canvas width
 * @param HEIGHT - Canvas height
 * @param SF - Scale factor
 * @returns Transformed [x, y] coordinates
 */
export function transformMouseCoordinates(
  mx: number,
  my: number,
  PIXEL_RATIO: number,
  zoomTransform: d3.ZoomTransform,
  WIDTH: number,
  HEIGHT: number,
  SF: number,
): [number, number] {
  const mxDevice = mx * PIXEL_RATIO;
  const myDevice = my * PIXEL_RATIO;
  const mxTransformed =
    ((mxDevice - zoomTransform.x * PIXEL_RATIO) / zoomTransform.k - WIDTH / 2) / SF;
  const myTransformed =
    ((myDevice - zoomTransform.y * PIXEL_RATIO) / zoomTransform.k - HEIGHT / 2) / SF;
  return [mxTransformed, myTransformed];
}

/**
 * Draws to a canvas context with zoom transform applied.
 * Centralizes the clear-save-transform-draw-restore cycle used by interaction layers.
 * @param context - Canvas 2D context to draw on
 * @param config - Configuration containing PIXEL_RATIO, WIDTH, HEIGHT
 * @param zoomState - Zoom state object (may be null)
 * @param drawFn - Drawing function to execute within the transformed context
 */
export function drawWithZoomTransform(
  context: CanvasRenderingContext2D,
  config: VisualizationConfig,
  zoomState: ZoomState | null,
  drawFn: () => void,
): void {
  const { PIXEL_RATIO, WIDTH, HEIGHT } = config;
  const transform = zoomState?.zoomTransform || d3.zoomIdentity;

  context.clearRect(0, 0, WIDTH, HEIGHT);
  context.save();
  applyZoomTransform(context, transform, PIXEL_RATIO, WIDTH, HEIGHT);
  drawFn();
  context.restore();
}
