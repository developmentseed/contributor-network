/**
 * Click interaction handling
 * @module interaction/click
 */

import { findNode as findNodeAtPosition } from './findNode.js';

/**
 * Sets up click interaction handlers on the canvas
 * @param {Object} options - Configuration options:
 *   - d3: D3 library instance
 *   - canvasSelector: CSS selector for the click canvas element
 *   - config: Configuration object containing PIXEL_RATIO, WIDTH, HEIGHT, SF, RADIUS_CONTRIBUTOR, CONTRIBUTOR_RING_WIDTH, sqrt
 *   - delaunayData: Delaunay triangulation data (will be updated: delaunay, nodesDelaunay, delaunayRemaining)
 *   - interactionState: Interaction state object
 *   - REPO_CENTRAL: ID of the central repository
 *   - canvas: Main canvas element (for opacity control)
 *   - contextClick: Canvas context for click layer
 *   - contextHover: Canvas context for hover layer
 *   - nodes: All nodes in the visualization
 *   - REMAINING_PRESENT: Whether remaining contributors are present
 *   - remainingContributors: Array of remaining contributor nodes
 *   - setClicked: Function to set clicked state
 *   - clearClick: Function to clear click state
 *   - clearHover: Function to clear hover state
 *   - setDelaunay: Function to update Delaunay data
 *   - drawHoverState: Function to draw hover state visualization
 */
export function setupClick(options) {
  const {
    d3,
    canvasSelector,
    config,
    delaunayData,
    interactionState,
    REPO_CENTRAL,
    canvas,
    contextClick,
    contextHover,
    nodes,
    REMAINING_PRESENT,
    remainingContributors,
    setClicked,
    clearClick,
    clearHover,
    setDelaunay,
    drawHoverState
  } = options;
  const { WIDTH, HEIGHT } = config;

  d3.select(canvasSelector).on("click", function (event) {
    // Get the position of the mouse on the canvas
    let [mx, my] = d3.pointer(event, this);
    let [d, FOUND] = findNodeAtPosition(mx, my, config, delaunayData, interactionState, REMAINING_PRESENT, remainingContributors);

    // Clear the "clicked" canvas
    contextClick.clearRect(0, 0, WIDTH, HEIGHT);

    // Skip click on the central pseudo-node (it's not a real entity)
    if (FOUND && d && d.id !== REPO_CENTRAL) {
      setClicked(interactionState, d);

      // Reset the delaunay for the hover, taking only the neighbors into account of the clicked node
      delaunayData.nodesDelaunay = d.neighbors ? [...d.neighbors, d] : nodes;
      delaunayData.delaunay = d3.Delaunay.from(delaunayData.nodesDelaunay.map((n) => [n.x, n.y]));
      setDelaunay(interactionState, delaunayData.delaunay, delaunayData.nodesDelaunay, delaunayData.delaunayRemaining);

      // Copy the context_hovered to the context_click without the tooltip
      drawHoverState(contextClick, d, false);
      // Empty the hovered canvas
      contextHover.clearRect(0, 0, WIDTH, HEIGHT);
    } else {
      clearClick(interactionState);
      clearHover(interactionState);

      // Reset the delaunay to all the nodes
      delaunayData.nodesDelaunay = nodes;
      delaunayData.delaunay = d3.Delaunay.from(delaunayData.nodesDelaunay.map((d) => [d.x, d.y]));
      setDelaunay(interactionState, delaunayData.delaunay, delaunayData.nodesDelaunay, delaunayData.delaunayRemaining);

      // Fade the main canvas back in
      canvas.style.opacity = "1";
    } // else
  }); // on click
}
