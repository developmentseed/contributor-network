/**
 * Click interaction handling
 * @module interaction/click
 */

import { findNode as findNodeAtPosition } from './findNode.js';
import { shouldSuppressClick, drawWithZoomTransform } from './zoom.js';

/**
 * Sets up click interaction handlers on the canvas
 * @param {Object} options - Configuration options:
 *   - d3: D3 library instance
 *   - canvasSelector: CSS selector for the click canvas element
 *   - config: Configuration object containing PIXEL_RATIO, WIDTH, HEIGHT, SF, RADIUS_CONTRIBUTOR, CONTRIBUTOR_RING_WIDTH, sqrt
 *   - delaunayData: Delaunay triangulation data (will be updated: delaunay, nodesDelaunay)
 *   - interactionState: Interaction state object
 *   - canvas: Main canvas element (for opacity control)
 *   - contextClick: Canvas context for click layer
 *   - contextHover: Canvas context for hover layer
 *   - nodes: All nodes in the visualization
 *   - setClicked: Function to set clicked state
 *   - clearClick: Function to clear click state
 *   - clearHover: Function to clear hover state
 *   - setDelaunay: Function to update Delaunay data
 *   - drawHoverState: Function to draw hover state visualization
 *   - zoomState: Optional zoom state object (for click suppression)
 *   - ZOOM_CLICK_SUPPRESS_MS: Optional milliseconds to suppress clicks after zoom/pan
 */
export function setupClick(options) {
  const {
    d3,
    canvasSelector,
    config,
    delaunayData,
    interactionState,
    canvas,
    contextClick,
    contextHover,
    nodes,
    setClicked,
    clearClick,
    clearHover,
    setDelaunay,
    drawHoverState
  } = options;
  const { WIDTH, HEIGHT } = config;

  d3.select(canvasSelector).on("click", function (event) {
    // Suppress clicks during zoom/pan
    if (options.zoomState && shouldSuppressClick(options.zoomState, options.ZOOM_CLICK_SUPPRESS_MS)) {
      return;
    }

    // Get the position of the mouse on the canvas
    let [mx, my] = d3.pointer(event, this);
    const zoomTransform = options.zoomState?.zoomTransform || null;
    let [d, FOUND] = findNodeAtPosition(mx, my, config, delaunayData, interactionState, zoomTransform);

    // Clear the "clicked" canvas
    contextClick.clearRect(0, 0, WIDTH, HEIGHT);

    if (FOUND && d) {
      setClicked(interactionState, d);

      // Reset the delaunay for the hover, taking only the neighbors into account of the clicked node
      delaunayData.nodesDelaunay = d.neighbors ? [...d.neighbors, d] : nodes;
      delaunayData.delaunay = d3.Delaunay.from(delaunayData.nodesDelaunay.map((n) => [n.x, n.y]));
      setDelaunay(interactionState, delaunayData.delaunay, delaunayData.nodesDelaunay);

      // Copy the context_hovered to the context_click without the tooltip
      // Uses centralized helper for zoom-transformed drawing
      drawWithZoomTransform(contextClick, config, options.zoomState, d3, () => {
        drawHoverState(contextClick, d, false);
      });
      // Empty the hovered canvas
      contextHover.clearRect(0, 0, WIDTH, HEIGHT);
    } else {
      clearClick(interactionState);
      clearHover(interactionState);

      // Reset the delaunay to all the nodes
      delaunayData.nodesDelaunay = nodes;
      delaunayData.delaunay = d3.Delaunay.from(delaunayData.nodesDelaunay.map((d) => [d.x, d.y]));
      setDelaunay(interactionState, delaunayData.delaunay, delaunayData.nodesDelaunay);

      // Fade the main canvas back in
      canvas.style.opacity = "1";
    } // else
  }); // on click
}
