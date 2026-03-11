/**
 * Canvas Setup and Management
 *
 * Functions for creating, configuring, and managing canvas layers
 * for the contributor network visualization.
 *
 * The visualization uses three canvas layers:
 * 1. Main canvas - Static rendering of nodes and links
 * 2. Click canvas - Overlay for click feedback
 * 3. Hover canvas - Top layer for hover interactions
 *
 * @module render/canvas
 */

import { COLORS, SIZES } from '../config/theme';

export interface CanvasLayer {
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D;
}

export interface CanvasStack {
  main: CanvasLayer;
  click: CanvasLayer;
  hover: CanvasLayer;
  container: HTMLElement;
}

export interface CanvasStackOptions {
  backgroundColor?: string;
}

/**
 * Default canvas configuration.
 */
export const CANVAS_DEFAULTS = {
  defaultSize: SIZES.defaultCanvas,
  backgroundColor: COLORS.background,
};

/**
 * Create a canvas element with an ID.
 */
export function createCanvas(id: string): CanvasLayer {
  const canvas = document.createElement('canvas');
  canvas.id = id;
  const context = canvas.getContext('2d')!;
  return { canvas, context };
}

/**
 * Apply base styling to a canvas element.
 */
export function styleCanvas(canvas: HTMLCanvasElement): void {
  canvas.style.display = 'block';
  canvas.style.margin = '0';
}

/**
 * Apply background layer styling to a canvas.
 * Used for the main and click canvases that sit behind the hover layer.
 */
export function styleBackgroundCanvas(canvas: HTMLCanvasElement): void {
  canvas.style.position = 'absolute';
  canvas.style.top = '0';
  canvas.style.left = '0';
  canvas.style.pointerEvents = 'none';
  canvas.style.zIndex = '1';
  canvas.style.transition = 'opacity 200ms ease-in';
}

/**
 * Apply hover layer styling to a canvas.
 * The hover canvas is the top layer that receives pointer events.
 */
export function styleHoverCanvas(canvas: HTMLCanvasElement): void {
  canvas.style.position = 'absolute';
  canvas.style.top = '0';
  canvas.style.left = '0';
  canvas.style.zIndex = '2';
}

/**
 * Configure the container element for the canvas layers.
 */
export function styleContainer(
  container: HTMLElement,
  backgroundColor: string = CANVAS_DEFAULTS.backgroundColor,
): void {
  container.style.position = 'relative';
  container.style.backgroundColor = backgroundColor;
}

/**
 * Set the size of a canvas element, accounting for pixel ratio.
 */
export function setCanvasSize(
  canvas: HTMLCanvasElement,
  width: number,
  height: number,
  pixelRatio: number = window.devicePixelRatio || 1,
): void {
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  canvas.width = width * pixelRatio;
  canvas.height = height * pixelRatio;
}

/**
 * Scale a canvas context to account for pixel ratio.
 */
export function scaleContext(
  context: CanvasRenderingContext2D,
  pixelRatio: number = window.devicePixelRatio || 1,
): void {
  context.scale(pixelRatio, pixelRatio);
}

/**
 * Clear a canvas.
 */
export function clearCanvas(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
): void {
  context.clearRect(0, 0, width, height);
}

/**
 * Fill a canvas with a solid color.
 */
export function fillCanvas(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  color: string,
): void {
  context.fillStyle = color;
  context.fillRect(0, 0, width, height);
}

/**
 * Create the complete canvas stack for the visualization.
 */
export function createCanvasStack(
  container: HTMLElement,
  options: CanvasStackOptions = {},
): CanvasStack {
  const { backgroundColor = CANVAS_DEFAULTS.backgroundColor } = options;

  styleContainer(container, backgroundColor);

  const main = createCanvas('canvas');
  const click = createCanvas('canvas-click');
  const hover = createCanvas('canvas-hover');

  styleCanvas(main.canvas);
  styleCanvas(click.canvas);
  styleCanvas(hover.canvas);

  styleBackgroundCanvas(main.canvas);
  styleBackgroundCanvas(click.canvas);
  styleHoverCanvas(hover.canvas);

  container.appendChild(main.canvas);
  container.appendChild(click.canvas);
  container.appendChild(hover.canvas);

  return {
    main,
    click,
    hover,
    container,
  };
}

/**
 * Resize all canvases in a stack.
 */
export function resizeCanvasStack(
  canvasStack: CanvasStack,
  width: number,
  height: number,
  pixelRatio: number = window.devicePixelRatio || 1,
): void {
  const { main, click, hover } = canvasStack;

  setCanvasSize(main.canvas, width, height, pixelRatio);
  setCanvasSize(click.canvas, width, height, pixelRatio);
  setCanvasSize(hover.canvas, width, height, pixelRatio);

  scaleContext(main.context, pixelRatio);
  scaleContext(click.context, pixelRatio);
  scaleContext(hover.context, pixelRatio);
}

/**
 * Get the device pixel ratio.
 */
export function getPixelRatio(): number {
  return window.devicePixelRatio || 1;
}
