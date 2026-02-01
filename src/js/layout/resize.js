/**
 * Canvas resize handling
 * @module layout/resize
 */

/**
 * Sizes a canvas element and sets up its rendering context
 * @param {HTMLCanvasElement} canvas - Canvas element to size
 * @param {CanvasRenderingContext2D} context - Canvas rendering context
 * @param {number} WIDTH - Canvas width in pixels
 * @param {number} HEIGHT - Canvas height in pixels
 * @param {number} width - Display width in CSS pixels
 * @param {number} PIXEL_RATIO - Device pixel ratio
 */
export function sizeCanvas(canvas, context, WIDTH, HEIGHT, width, PIXEL_RATIO) {
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${HEIGHT / PIXEL_RATIO}px`;

  // Some canvas settings
  context.lineJoin = "round";
  context.lineCap = "round";
}

/**
 * Calculates the scale factor based on width and outer ring radius
 * @param {number} WIDTH - Canvas width
 * @param {number} DEFAULT_SIZE - Default canvas size
 * @param {number} RADIUS_CONTRIBUTOR_NON_ORCA - Radius for non-ORCA contributors
 * @param {number} ORCA_RING_WIDTH - Width of ORCA ring
 * @returns {number} Scale factor
 */
export function calculateScaleFactor(WIDTH, DEFAULT_SIZE, RADIUS_CONTRIBUTOR_NON_ORCA, ORCA_RING_WIDTH) {
  // Set the scale factor
  let SF = WIDTH / DEFAULT_SIZE;
  // If this means that the ring won't fit, make the SF smaller
  let OUTER_RING = RADIUS_CONTRIBUTOR_NON_ORCA + (ORCA_RING_WIDTH / 2) * 2;
  if (WIDTH / 2 < OUTER_RING * SF) SF = WIDTH / (2 * OUTER_RING);
  return SF;
}

/**
 * Handles canvas resize and updates Delaunay triangulation
 * @param {Object} canvases - Canvas elements:
 *   - canvas: Main canvas
 *   - canvas_click: Click canvas
 *   - canvas_hover: Hover canvas
 * @param {Object} contexts - Canvas contexts:
 *   - context: Main context
 *   - context_click: Click context
 *   - context_hover: Hover context
 * @param {Object} config - Configuration:
 *   - width: Display width
 *   - height: Display height
 *   - DEFAULT_SIZE: Default canvas size
 *   - RADIUS_CONTRIBUTOR_NON_ORCA: Radius for non-ORCA contributors
 *   - ORCA_RING_WIDTH: Width of ORCA ring
 *   - round: Round function (Math.round)
 * @param {Object} state - State objects to update:
 *   - WIDTH: Canvas width (will be updated)
 *   - HEIGHT: Canvas height (will be updated)
 *   - PIXEL_RATIO: Pixel ratio (will be updated)
 *   - SF: Scale factor (will be updated)
 *   - nodes_delaunay: Nodes for Delaunay (will be updated)
 *   - delaunay: Delaunay triangulation (will be updated)
 *   - delaunay_remaining: Remaining Delaunay (will be updated)
 * @param {Object} data - Data arrays:
 *   - nodes: All nodes
 *   - remainingContributors: Remaining contributor nodes
 * @param {boolean} REMAINING_PRESENT - Whether remaining contributors are present
 * @param {Object} d3 - D3 library instance
 * @param {Function} setDelaunay - Function to update Delaunay in interaction state
 * @param {Object} interactionState - Interaction state object
 * @param {Function} draw - Function to redraw the visualization
 */
export function handleResize(
  canvases,
  contexts,
  config,
  state,
  data,
  REMAINING_PRESENT,
  d3,
  setDelaunay,
  interactionState,
  draw
) {
  const { width, height, DEFAULT_SIZE, RADIUS_CONTRIBUTOR_NON_ORCA, ORCA_RING_WIDTH, round } = config;
  const { nodes, remainingContributors } = data;

  // Screen pixel ratio
  state.PIXEL_RATIO = Math.max(2, window.devicePixelRatio);

  // It's the width that determines the size
  state.WIDTH = round(width * state.PIXEL_RATIO);
  state.HEIGHT = round(height * state.PIXEL_RATIO);

  // Size all canvases
  sizeCanvas(canvases.canvas, contexts.context, state.WIDTH, state.HEIGHT, width, state.PIXEL_RATIO);
  sizeCanvas(canvases.canvas_click, contexts.context_click, state.WIDTH, state.HEIGHT, width, state.PIXEL_RATIO);
  sizeCanvas(canvases.canvas_hover, contexts.context_hover, state.WIDTH, state.HEIGHT, width, state.PIXEL_RATIO);

  // Set the scale factor
  state.SF = state.WIDTH / DEFAULT_SIZE;
  // If this means that the ring won't fit, make the SF smaller
  let OUTER_RING = RADIUS_CONTRIBUTOR_NON_ORCA + (ORCA_RING_WIDTH / 2) * 2;
  if (state.WIDTH / 2 < OUTER_RING * state.SF) state.SF = state.WIDTH / (2 * OUTER_RING);

  // Reset the delaunay for the mouse events
  state.nodes_delaunay = nodes;
  state.delaunay = d3.Delaunay.from(state.nodes_delaunay.map((d) => [d.x, d.y]));
  if (REMAINING_PRESENT) {
    state.delaunay_remaining = d3.Delaunay.from(
      remainingContributors.map((d) => [d.x, d.y]),
    );
  }
  // Update interaction state with Delaunay data
  setDelaunay(interactionState, state.delaunay, state.nodes_delaunay, state.delaunay_remaining);

  // Draw the visual
  draw();
}
