/**
 * Find node at mouse position using Delaunay triangulation
 * @module interaction/findNode
 */

/**
 * Finds the node at the given mouse coordinates using Delaunay triangulation
 * @param {number} mx - Mouse x coordinate (in canvas pixels)
 * @param {number} my - Mouse y coordinate (in canvas pixels)
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
 * @param {boolean} REMAINING_PRESENT - Whether remaining contributors are present
 * @param {Array} remainingContributors - Array of remaining contributor nodes
 * @returns {Array} [node, found] - The found node (or null) and whether it was found
 */
export function findNode(mx, my, config, delaunayData, interactionState, REMAINING_PRESENT, remainingContributors) {
  const { PIXEL_RATIO, WIDTH, HEIGHT, SF, RADIUS_CONTRIBUTOR_NON_ORCA, ORCA_RING_WIDTH, sqrt } = config;
  const { delaunay, nodesDelaunay, delaunayRemaining } = delaunayData;

  // Convert mouse coordinates to visualization coordinates
  mx = (mx * PIXEL_RATIO - WIDTH / 2) / SF;
  my = (my * PIXEL_RATIO - HEIGHT / 2) / SF;

  // Check if mouse is within the visualization bounds (with some margin)
  const MAX_RADIUS = RADIUS_CONTRIBUTOR_NON_ORCA + ORCA_RING_WIDTH + 200;
  const distFromCenter = sqrt(mx * mx + my * my);
  if (distFromCenter > MAX_RADIUS) {
    return [null, false];
  }

  // Get the closest hovered node
  let point = delaunay.find(mx, my);
  let d = nodesDelaunay[point];

  // Safety check - if no node found, return early
  if (!d) {
    return [null, false];
  }

  // Get the distance from the mouse to the node
  let dist = sqrt((d.x - mx) ** 2 + (d.y - my) ** 2);
  // If the distance is too big, don't show anything
  let FOUND = dist < d.r + (interactionState.clickActive ? 10 : 50);

  // Check if the mouse is close enough to one of the remaining contributors if FOUND is false
  if (!FOUND && REMAINING_PRESENT && delaunayRemaining) {
    point = delaunayRemaining.find(mx, my);
    d = remainingContributors[point];
    if (d) {
      dist = sqrt((d.x - mx) ** 2 + (d.y - my) ** 2);
      FOUND = dist < d.r + 5;
    }
  } // if

  return [d, FOUND];
}
