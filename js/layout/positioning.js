/**
 * Contributor Node Positioning Module
 *
 * Calculates the radius for the contributor ring and positions contributor nodes
 * in a circle around the central repository. Also handles positioning of connected
 * single-degree repositories relative to their contributors.
 *
 * @module layout/positioning
 */

import { TAU, PI, cos, sin } from '../utils/helpers.js';

// ============================================================
// Configuration Constants
// ============================================================
// These control the contributor ring layout algorithm

/** Multiplier for calculating ring width from radius (empirically tuned) */
const RING_WIDTH_MULTIPLIER = 2.3;

/** Minimum pixels per contributor when calculating minimum radius */
const MIN_RADIUS_PER_CONTRIBUTOR = 15;

/** Absolute minimum radius for the contributor ring (prevents collapse) */
const ABSOLUTE_MIN_RADIUS = 200;

/**
 * Position contributor nodes in a ring around the central repository
 *
 * This function:
 * - Calculates the optimal radius for the contributor ring based on node sizes
 * - Positions contributors evenly around the circle
 * - Handles positioning of connected single-degree repositories
 * - Updates RADIUS_CONTRIBUTOR and CONTRIBUTOR_RING_WIDTH
 *
 * @param {Object} data - Input data:
 *   - nodes: Array of all nodes
 *   - contributors: Array of contributor data objects
 *   - central_repo: Central repository node object
 * @param {Object} config - Configuration:
 *   - CONTRIBUTOR_PADDING: Padding between contributor nodes
 * @returns {Object} Updated values:
 *   - RADIUS_CONTRIBUTOR: Calculated radius for contributor ring
 *   - CONTRIBUTOR_RING_WIDTH: Width of the contributor ring
 */
export function positionContributorNodes(data, config) {
  const { nodes, contributors, central_repo } = data;
  const { CONTRIBUTOR_PADDING } = config;

  // ============================================================
  // Input Validation
  // ============================================================
  // Validate central_repo is positioned before we try to use its coordinates
  if (!central_repo) {
    throw new Error('positionContributorNodes: central_repo is required');
  }
  if (!isFinite(central_repo.fx) || !isFinite(central_repo.fy)) {
    throw new Error(
      'positionContributorNodes: central_repo must be positioned (fx, fy set) before calling. ' +
      `Got fx=${central_repo.fx}, fy=${central_repo.fy}`
    );
  }

  // Validate nodes array
  if (!Array.isArray(nodes) || nodes.length === 0) {
    console.warn('positionContributorNodes: nodes array is empty or invalid');
    return {
      RADIUS_CONTRIBUTOR: ABSOLUTE_MIN_RADIUS,
      CONTRIBUTOR_RING_WIDTH: 0
    };
  }

  // ============================================================
  // Contributor Node Preparation
  // ============================================================
  // Ensure all contributors have a valid max_radius before calculating ring size
  const contributorNodes = nodes.filter((d) => d.type === "contributor");
  contributorNodes.forEach((d) => {
    // Ensure max_radius is set - fallback to contributor's own radius
    if (!d.max_radius || !isFinite(d.max_radius) || d.max_radius <= 0) {
      d.max_radius = d.r || 20; // Minimum fallback radius
    }
    // Ensure connected_single_repo array exists
    if (!d.connected_single_repo) {
      d.connected_single_repo = [];
    }
  });

  // Get the sum of all the contributor nodes' max_radius
  let sum_radius = contributorNodes
    .reduce((acc, curr) => acc + curr.max_radius * 2, 0);
  // Take padding into account between the contributor nodes
  sum_radius += contributors.length * CONTRIBUTOR_PADDING;
  // This sum should be the circumference of the circle around the central node, what radius belongs to this -> 2*pi*R
  let RADIUS_CONTRIBUTOR = sum_radius / TAU;

  // Ensure minimum radius so contributors don't collapse to center
  // Use a larger minimum that scales with the number of contributors
  const MIN_RADIUS = Math.max(ABSOLUTE_MIN_RADIUS, contributorNodes.length * MIN_RADIUS_PER_CONTRIBUTOR);
  let useEvenSpacing = false;
  if (!isFinite(RADIUS_CONTRIBUTOR) || RADIUS_CONTRIBUTOR < MIN_RADIUS) {
    console.warn(`RADIUS_CONTRIBUTOR too small (${RADIUS_CONTRIBUTOR}), using minimum ${MIN_RADIUS}`);
    RADIUS_CONTRIBUTOR = MIN_RADIUS;
    useEvenSpacing = true; // When using minimum, distribute evenly
  }

  // Calculate ring width using the multiplier constant
  // Formula: ((R * multiplier) / 2 - R) * 2 = R * (multiplier - 2)
  const CONTRIBUTOR_RING_WIDTH = ((RADIUS_CONTRIBUTOR * RING_WIDTH_MULTIPLIER) / 2 - RADIUS_CONTRIBUTOR) * 2;

  // Calculate even angle increment for when we need to override spacing
  const evenAngleIncrement = TAU / contributorNodes.length;

  // Always log positioning info for debugging
  console.log(`positionContributorNodes: ${contributorNodes.length} contributors, sum_radius=${sum_radius}, RADIUS_CONTRIBUTOR=${RADIUS_CONTRIBUTOR}, useEvenSpacing=${useEvenSpacing}`);

  // Fix the contributor nodes in a ring around the central node
  let angle = 0;
  contributorNodes.forEach((d, i) => {
    // Subtract the contributor node position from all it's connected single-degree repos
    // (this converts their positions from absolute to relative to the contributor)
    if (d.connected_single_repo && d.connected_single_repo.length > 0) {
      d.connected_single_repo.forEach((repo) => {
        repo.x -= d.x;
        repo.y -= d.y;
      });
    }

    // Find the new position of the contributor node in a ring around the central node
    // max_radius should already be set from the validation above

    // Debug: log first few contributor positions
    if (i < 3) {
      console.log(`Contributor ${i} "${d.id}": max_radius=${d.max_radius}, r=${d.r}, central_repo=(${central_repo.fx}, ${central_repo.fy})`);
    }

    let contributor_arc = d.max_radius * 2 + CONTRIBUTOR_PADDING;
    // translate this distance to an angle
    let contributor_angle;
    if (useEvenSpacing) {
      // When using minimum radius, distribute evenly around the circle
      contributor_angle = evenAngleIncrement / 2;
    } else {
      contributor_angle = contributor_arc / RADIUS_CONTRIBUTOR / 2;
    }

    let radius_drawn = RADIUS_CONTRIBUTOR;
    d.x =
      central_repo.fx +
      radius_drawn * cos(angle + contributor_angle - PI / 2);
    d.y =
      central_repo.fy +
      radius_drawn * sin(angle + contributor_angle - PI / 2);
    d.contributor_angle = angle + contributor_angle - PI / 2;
    angle += useEvenSpacing ? evenAngleIncrement : contributor_angle * 2;

    // Fix the contributors for the force simulation
    d.fx = d.x;
    d.fy = d.y;

    // Add the new contributor position to all it's connected single-degree repos
    // (converting their positions back from relative to absolute)
    if (d.connected_single_repo && d.connected_single_repo.length > 0) {
      d.connected_single_repo.forEach((repo) => {
        repo.x += d.x;
        repo.y += d.y;

        // Fix position for force simulation
        repo.fx = repo.x;
        repo.fy = repo.y;
      });
    }
  });

  return {
    RADIUS_CONTRIBUTOR,
    CONTRIBUTOR_RING_WIDTH
  };
}
