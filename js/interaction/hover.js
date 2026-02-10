/**
 * Hover interaction handling
 * @module interaction/hover
 */

import { findNode as findNodeAtPosition } from './findNode.js';
import { drawWithZoomTransform } from './zoom.js';

/**
 * Sets up hover interaction handlers on the canvas
 * @param {Object} options - Configuration options:
 *   - d3: D3 library instance
 *   - canvasSelector: CSS selector for the hover canvas element
 *   - config: Configuration object containing PIXEL_RATIO, WIDTH, HEIGHT, SF, RADIUS_CONTRIBUTOR, CONTRIBUTOR_RING_WIDTH, sqrt
 *   - delaunayData: Delaunay triangulation data (delaunay, nodesDelaunay)
 *   - interactionState: Interaction state object
 *   - canvas: Main canvas element (for opacity control)
 *   - contextHover: Canvas context for hover layer
 *   - setHovered: Function to set hovered state
 *   - clearHover: Function to clear hover state
 *   - drawHoverState: Function to draw hover state visualization
 */
export function setupHover(options) {
  const {
    d3,
    canvasSelector,
    config,
    delaunayData,
    interactionState,
    canvas,
    contextHover,
    setHovered,
    clearHover,
    drawHoverState
  } = options;
  const { WIDTH, HEIGHT } = config;

  d3.select(canvasSelector).on("mousemove", function (event) {
    try {
      // Get the position of the mouse on the canvas
      let [mx, my] = d3.pointer(event, this);
      const zoomTransform = options.zoomState?.zoomTransform || null;
      let [d, FOUND] = findNodeAtPosition(mx, my, config, delaunayData, interactionState, zoomTransform);

      // Draw the hover state on the top canvas
      if (FOUND && d) {
        setHovered(interactionState, d);

        // Fade out the main canvas, using CSS
        canvas.style.opacity = d.type === "contributor" ? "0.15" : "0.3";

        // Draw the hovered node and its neighbors and links
        // Uses centralized helper for zoom-transformed drawing
        drawWithZoomTransform(contextHover, config, options.zoomState, d3, () => {
          drawHoverState(contextHover, d);
        });
      } else {
        contextHover.clearRect(0, 0, WIDTH, HEIGHT);
        clearHover(interactionState);

        if (!interactionState.clickActive) {
          // Fade the main canvas back in
          canvas.style.opacity = "1";
        } // if
      } // else
    } catch (err) {
      // Log error but don't break the handler
      console.warn("Hover error:", err);
      contextHover.clearRect(0, 0, WIDTH, HEIGHT);
      clearHover(interactionState);
      if (!interactionState.clickActive) canvas.style.opacity = "1";
    }
  }); // on mousemove

  // Clean up hover state when mouse leaves the canvas
  d3.select(canvasSelector).on("mouseleave", function () {
    contextHover.clearRect(0, 0, WIDTH, HEIGHT);
    clearHover(interactionState);

    if (!interactionState.clickActive) {
      canvas.style.opacity = "1";
    }
  }); // on mouseleave
}
