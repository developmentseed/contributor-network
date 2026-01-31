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

import { COLORS, SIZES } from '../config/theme.js';

/**
 * Default canvas configuration.
 */
export const CANVAS_DEFAULTS = {
  defaultSize: SIZES.defaultCanvas,
  backgroundColor: COLORS.background
};

/**
 * Create a canvas element with an ID.
 *
 * @param {string} id - The canvas element ID
 * @returns {{ canvas: HTMLCanvasElement, context: CanvasRenderingContext2D }}
 */
export function createCanvas(id) {
  const canvas = document.createElement('canvas');
  canvas.id = id;
  const context = canvas.getContext('2d');
  return { canvas, context };
}

/**
 * Apply base styling to a canvas element.
 *
 * @param {HTMLCanvasElement} canvas - The canvas element
 */
export function styleCanvas(canvas) {
  canvas.style.display = 'block';
  canvas.style.margin = '0';
}

/**
 * Apply background layer styling to a canvas.
 * Used for the main and click canvases that sit behind the hover layer.
 *
 * @param {HTMLCanvasElement} canvas - The canvas element
 */
export function styleBackgroundCanvas(canvas) {
  canvas.style.position = 'absolute';
  canvas.style.top = '0';
  canvas.style.left = '0';
  canvas.style.pointerEvents = 'none';
  canvas.style.zIndex = '0';
  canvas.style.transition = 'opacity 200ms ease-in';
}

/**
 * Apply hover layer styling to a canvas.
 * The hover canvas is the top layer that receives pointer events.
 *
 * @param {HTMLCanvasElement} canvas - The canvas element
 */
export function styleHoverCanvas(canvas) {
  canvas.style.position = 'relative';
  canvas.style.zIndex = '1';
}

/**
 * Configure the container element for the canvas layers.
 *
 * @param {HTMLElement} container - The container element
 * @param {string} backgroundColor - Background color
 */
export function styleContainer(container, backgroundColor = CANVAS_DEFAULTS.backgroundColor) {
  container.style.position = 'relative';
  container.style.backgroundColor = backgroundColor;
}

/**
 * Set the size of a canvas element, accounting for pixel ratio.
 *
 * @param {HTMLCanvasElement} canvas - The canvas element
 * @param {number} width - Logical width
 * @param {number} height - Logical height
 * @param {number} pixelRatio - Device pixel ratio (default: window.devicePixelRatio)
 */
export function setCanvasSize(canvas, width, height, pixelRatio = window.devicePixelRatio || 1) {
  // Set the display size
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;

  // Set the actual canvas resolution
  canvas.width = width * pixelRatio;
  canvas.height = height * pixelRatio;
}

/**
 * Scale a canvas context to account for pixel ratio.
 *
 * @param {CanvasRenderingContext2D} context - The canvas context
 * @param {number} pixelRatio - Device pixel ratio
 */
export function scaleContext(context, pixelRatio = window.devicePixelRatio || 1) {
  context.scale(pixelRatio, pixelRatio);
}

/**
 * Clear a canvas.
 *
 * @param {CanvasRenderingContext2D} context - The canvas context
 * @param {number} width - Canvas width
 * @param {number} height - Canvas height
 */
export function clearCanvas(context, width, height) {
  context.clearRect(0, 0, width, height);
}

/**
 * Fill a canvas with a solid color.
 *
 * @param {CanvasRenderingContext2D} context - The canvas context
 * @param {number} width - Canvas width
 * @param {number} height - Canvas height
 * @param {string} color - Fill color
 */
export function fillCanvas(context, width, height, color) {
  context.fillStyle = color;
  context.fillRect(0, 0, width, height);
}

/**
 * Create the complete canvas stack for the visualization.
 *
 * @param {HTMLElement} container - The container element
 * @param {Object} options - Configuration options
 * @param {string} options.backgroundColor - Background color
 * @returns {Object} Object containing canvas layers and contexts
 */
export function createCanvasStack(container, options = {}) {
  const { backgroundColor = CANVAS_DEFAULTS.backgroundColor } = options;

  // Configure container
  styleContainer(container, backgroundColor);

  // Create the three canvas layers
  const main = createCanvas('canvas');
  const click = createCanvas('canvas-click');
  const hover = createCanvas('canvas-hover');

  // Apply styling
  styleCanvas(main.canvas);
  styleCanvas(click.canvas);
  styleCanvas(hover.canvas);

  styleBackgroundCanvas(main.canvas);
  styleBackgroundCanvas(click.canvas);
  styleHoverCanvas(hover.canvas);

  // Append to container in order (main at bottom, hover on top)
  container.appendChild(main.canvas);
  container.appendChild(click.canvas);
  container.appendChild(hover.canvas);

  return {
    main,
    click,
    hover,
    container
  };
}

/**
 * Resize all canvases in a stack.
 *
 * @param {Object} canvasStack - The canvas stack from createCanvasStack
 * @param {number} width - New width
 * @param {number} height - New height
 * @param {number} pixelRatio - Device pixel ratio
 */
export function resizeCanvasStack(canvasStack, width, height, pixelRatio = window.devicePixelRatio || 1) {
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
 *
 * @returns {number} The device pixel ratio
 */
export function getPixelRatio() {
  return window.devicePixelRatio || 1;
}

/**
 * Calculate scale factor based on container width.
 *
 * @param {number} containerWidth - The container width
 * @param {number} defaultSize - The default/reference size
 * @returns {number} Scale factor
 */
export function calculateScaleFactor(containerWidth, defaultSize = CANVAS_DEFAULTS.defaultSize) {
  return containerWidth / defaultSize;
}
