/**
 * Hover interaction handling
 * @module interaction/hover
 */

import { findNode as findNodeAtPosition } from './findNode.js';

/**
 * Sets up hover interaction handlers on the canvas
 * @param {Object} d3 - D3 library instance
 * @param {string} canvasSelector - CSS selector for the hover canvas element
 * @param {Object} config - Configuration object containing:
 *   - PIXEL_RATIO: Device pixel ratio
 *   - WIDTH: Canvas width
 *   - HEIGHT: Canvas height
 *   - SF: Scale factor
 *   - RADIUS_CONTRIBUTOR_NON_ORCA: Radius for non-ORCA contributors
 *   - ORCA_RING_WIDTH: Width of ORCA ring
 *   - sqrt: Square root function (Math.sqrt)
 * @param {Object} delaunayData - Delaunay triangulation data:
 *   - delaunay: Main Delaunay triangulation
 *   - nodesDelaunay: Nodes used for main Delaunay
 *   - delaunayRemaining: Optional Delaunay for remaining contributors
 * @param {Object} interactionState - Interaction state object
 * @param {string} REPO_CENTRAL - ID of the central repository
 * @param {HTMLElement} canvas - Main canvas element (for opacity control)
 * @param {CanvasRenderingContext2D} contextHover - Canvas context for hover layer
 * @param {boolean} REMAINING_PRESENT - Whether remaining contributors are present
 * @param {Array} remainingContributors - Array of remaining contributor nodes
 * @param {Function} setHovered - Function to set hovered state
 * @param {Function} clearHover - Function to clear hover state
 * @param {Function} drawHoverState - Function to draw hover state visualization
 */
export function setupHover(
  d3,
  canvasSelector,
  config,
  delaunayData,
  interactionState,
  REPO_CENTRAL,
  canvas,
  contextHover,
  REMAINING_PRESENT,
  remainingContributors,
  setHovered,
  clearHover,
  drawHoverState
) {
  const { WIDTH, HEIGHT } = config;

  d3.select(canvasSelector).on("mousemove", function (event) {
    try {
      // Get the position of the mouse on the canvas
      let [mx, my] = d3.pointer(event, this);
      let [d, FOUND] = findNodeAtPosition(mx, my, config, delaunayData, interactionState, REMAINING_PRESENT, remainingContributors);

      // Draw the hover state on the top canvas
      // Skip hover on the central pseudo-node (it's not a real entity)
      if (FOUND && d && d.id !== REPO_CENTRAL) {
        setHovered(interactionState, d);

        // Fade out the main canvas, using CSS
        if (!d.remaining_contributor)
          canvas.style.opacity = d.type === "contributor" ? "0.15" : "0.3";

        // Draw the hovered node and its neighbors and links
        drawHoverState(contextHover, d);
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
