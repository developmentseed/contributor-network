/**
 * Shape drawing utilities (circles, arcs, links, patterns)
 * @module render/shapes
 */

import { TAU } from '../utils/helpers.js';

/**
 * Draws a circle on the canvas
 * @param {CanvasRenderingContext2D} context - Canvas rendering context
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @param {number} SF - Scale factor
 * @param {number} r - Radius (default: 10)
 * @param {boolean} begin - Whether to begin a new path (default: true)
 * @param {boolean} stroke - Whether to stroke instead of fill (default: false)
 */
export function drawCircle(context, x, y, SF, r = 10, begin = true, stroke = false) {
  if (begin === true) context.beginPath();
  context.moveTo((x + r) * SF, y * SF);
  context.arc(x * SF, y * SF, r * SF, 0, TAU);
  if (begin && stroke == false) context.fill();
}

/**
 * Draws a curved arc for a line
 * @param {CanvasRenderingContext2D} context - Canvas rendering context
 * @param {number} SF - Scale factor
 * @param {Object} line - Line object with source, target, center, r, sign
 */
export function drawCircleArc(context, SF, line) {
  // Guard against missing arc center (can happen if arc radius is impossible)
  if (!line.center) {
    // Fallback to straight line
    context.lineTo(line.target.x * SF, line.target.y * SF);
    return;
  }

  let center = line.center;
  let ang1 = Math.atan2(
    line.source.y * SF - center.y * SF,
    line.source.x * SF - center.x * SF,
  );
  let ang2 = Math.atan2(
    line.target.y * SF - center.y * SF,
    line.target.x * SF - center.x * SF,
  );
  context.arc(
    center.x * SF,
    center.y * SF,
    line.r * SF,
    ang1,
    ang2,
    line.sign,
  );
}

/**
 * Draws a line on the canvas
 * @param {CanvasRenderingContext2D} context - Canvas rendering context
 * @param {number} SF - Scale factor
 * @param {Object} line - Line object with source, target, and optional center
 */
export function drawLine(context, SF, line) {
  context.beginPath();
  context.moveTo(line.source.x * SF, line.source.y * SF);
  if (line.center) drawCircleArc(context, SF, line);
  else context.lineTo(line.target.x * SF, line.target.y * SF);
  context.stroke();
}

/**
 * Draws a node (circle) on the canvas
 * @param {CanvasRenderingContext2D} context - Canvas rendering context
 * @param {number} SF - Scale factor
 * @param {Object} d - Node data
 * @param {Object} config - Configuration object:
 *   - COLOR_BACKGROUND: Background color
 *   - max: Max function (Math.max)
 * @param {Object} interactionState - Interaction state object
 */
export function drawNode(context, SF, d, config, interactionState) {
  const { COLOR_BACKGROUND, max } = config;

  // Draw a circle for the node
  context.shadowBlur = interactionState.hoverActive ? 0 : max(2, d.r * 0.2) * SF;
  context.shadowColor = "#f7f7f7";

  context.fillStyle = d.color;
  drawCircle(context, d.x, d.y, SF, d.r);
  context.shadowBlur = 0;

  // Also draw a stroke around the node
  context.strokeStyle = COLOR_BACKGROUND;
  context.lineWidth = max(interactionState.hoverActive ? 1.5 : 1, d.r * 0.07) * SF;
  drawCircle(context, d.x, d.y, SF, d.r, true, true);
  context.stroke();
}

/**
 * Draws an arc around a repository node showing contributor activity time range
 * @param {CanvasRenderingContext2D} context - Canvas rendering context
 * @param {number} SF - Scale factor
 * @param {Object} d - Node data
 * @param {Object} interactionState - Interaction state object
 * @param {string} COLOR_CONTRIBUTOR - Contributor color
 */
export function drawNodeArc(context, SF, d, interactionState, COLOR_CONTRIBUTOR, d3, central_repo) {
  // Draw an arc around the repository node that shows how long the contributor has been active in that repo for all its existence, based on the first and last commit time
  if (
    interactionState.hoverActive &&
    interactionState.hoveredNode &&
    interactionState.hoveredNode.type === "contributor" &&
    d.type === "repo"
  ) {
    let link = interactionState.hoveredNode.data.links_original.find((p) => p.repo === d.id);
    // Only draw arc if link exists
    if (link) timeRangeArc(context, SF, d, d, link, COLOR_CONTRIBUTOR, d3, central_repo);
  } // if
}

/**
 * Draws a stroked ring around a hovered node
 * @param {CanvasRenderingContext2D} context - Canvas rendering context
 * @param {Object} d - Node data
 * @param {number} SF - Scale factor
 * @param {Object} central_repo - Deprecated, no longer used
 */
export function drawHoverRing(context, d, SF, central_repo) {
  let r = d.r + (d.type === "contributor" ? 9 : 7);
  context.beginPath();
  context.moveTo((d.x + r) * SF, d.y * SF);
  context.arc(d.x * SF, d.y * SF, r * SF, 0, TAU);
  context.strokeStyle = d.color;
  context.lineWidth = 3 * SF;
  context.stroke();
}

/**
 * Draws a tiny arc around a node showing contributor involvement time range
 * @param {CanvasRenderingContext2D} context - Canvas rendering context
 * @param {number} SF - Scale factor
 * @param {Object} d - Node data
 * @param {Object} repo - Repository data
 * @param {Object} link - Link data with commit_sec_min and commit_sec_max
 * @param {string} COL - Color (default: COLOR_REPO_MAIN)
 * @param {Object} d3 - D3 library instance
 * @param {Object} central_repo - Deprecated, no longer used
 */
export function timeRangeArc(context, SF, d, repo, link, COL, d3, central_repo) {
  context.save();
  context.translate(d.x * SF, d.y * SF);

  context.fillStyle = COL;
  context.strokeStyle = COL;

  // The scale for between which min and max date the contributor has been involved in the repo
  const scale_involved_range = d3
    .scaleLinear()
    .domain([repo.data.createdAt, repo.data.updatedAt])
    .range([0, TAU]);

  let r_inner =
    d.r + (d.type === "contributor" ? 2.5 : 1);
  let r_outer = r_inner + 3;

  const arc = d3
    .arc()
    .innerRadius(r_inner * SF)
    .outerRadius(r_outer * SF)
    .startAngle(scale_involved_range(link.commit_sec_min))
    .endAngle(scale_involved_range(link.commit_sec_max))
    .context(context);

  // Create the arc
  context.beginPath();
  arc();
  context.fill();

  context.restore();
}

/**
 * Fills a circle with a diagonal hatch pattern
 * @param {CanvasRenderingContext2D} context - Canvas rendering context
 * @param {number} radius - Radius of the circle
 * @param {number} angle - Angle for the hatch pattern
 * @param {number} SF - Scale factor
 * @param {string} color - Color for the hatch pattern
 * @param {Function} sin - Sine function (Math.sin)
 */
export function drawHatchPattern(context, radius, angle, SF, color, sin) {
  context.save();
  context.beginPath();
  context.arc(0, 0, radius, 0, TAU);
  context.clip();

  const lW = 1.5 * SF;
  const step = 4 * lW * sin(angle / 2);

  context.lineWidth = lW;
  context.strokeStyle = color;
  for (let x = -2.5 * radius; x < 2.5 * radius; x += step) {
    context.beginPath();
    context.moveTo(x, -radius);
    context.lineTo(x + radius * Math.tan(angle / 2), radius);
    context.stroke();
  } // for x
  context.restore();
}

/**
 * Draws a link between source and target nodes
 * @param {CanvasRenderingContext2D} context - Canvas rendering context
 * @param {number} SF - Scale factor
 * @param {Object} l - Link object
 * @param {Object} config - Configuration object:
 *   - COLOR_LINK: Default link color
 * @param {Object} interactionState - Interaction state object
 * @param {Function} calculateLinkGradient - Function to calculate link gradient
 * @param {Function} calculateEdgeCenters - Function to calculate edge centers
 * @param {Function} scale_link_width - Function to scale link width
 */
export function drawLink(context, SF, l, config, interactionState, calculateLinkGradient, calculateEdgeCenters, scale_link_width) {
  const { COLOR_LINK } = config;
  
  // Guard: only draw links with valid, positioned nodes
  if (
    !l.source || !l.target ||
    typeof l.source.x !== 'number' || typeof l.target.x !== 'number' ||
    !isFinite(l.source.x) || !isFinite(l.source.y) ||
    !isFinite(l.target.x) || !isFinite(l.target.y)
  ) {
    return; // Skip this link - prevents rendering errors
  }

  if (l.source.x !== undefined && l.target.x !== undefined) {
    calculateLinkGradient(context, l);
    calculateEdgeCenters(l, 1);
    // Use gradient if available, fall back to solid color
    context.strokeStyle = l.gradient || COLOR_LINK;
  } else context.strokeStyle = COLOR_LINK;

  // Base line width
  let line_width = scale_link_width(l.commit_count);

  // If a hover is active, and the hovered node is a contributor, and this is a link between an owner and repository, make the line width depend on the commit_count of the original link between the contributor and the repository
  if (
    interactionState.hoverActive &&
    interactionState.hoveredNode &&
    interactionState.hoveredNode.type === "contributor" &&
    interactionState.hoveredNode.data &&
    interactionState.hoveredNode.data.links_original &&
    l.source.type === "owner" &&
    l.target.type === "repo"
  ) {
    // Find the link between this contributor and the repository in the links_original
    let link_original = interactionState.hoveredNode.data.links_original.find(
      (p) => p.repo === l.target.id,
    );
    // Base the line width on this commit count
    if (link_original)
      line_width = scale_link_width(link_original.commit_count);
  } // if

  context.lineWidth = line_width * SF;
  drawLine(context, SF, l);
}

/**
 * Draws the contributor ring - a filled ring band where contributors are positioned
 * Uses the "winding rule" technique: outer arc clockwise + inner arc counterclockwise
 * to create a filled ring shape (not just outlines).
 * Ring is centered at the viewport origin (0, 0).
 *
 * @param {CanvasRenderingContext2D} context - Canvas rendering context
 * @param {number} SF - Scale factor
 * @param {number} RADIUS_CONTRIBUTOR - Radius of the contributor ring
 * @param {number} CONTRIBUTOR_RING_WIDTH - Width of the contributor ring
 * @param {string} COLOR_RING - Ring fill color (default: Grenadier orange)
 */
export function drawContributorRing(context, SF, RADIUS_CONTRIBUTOR, CONTRIBUTOR_RING_WIDTH, COLOR_RING = '#CF3F02') {
  // Ring is centered at viewport origin (0, 0)
  const center_x = 0;
  const center_y = 0;

  // Position the ring so contributor dots sit at 1/3 from the inner edge
  // (more ring space on the outer/name side, less empty space inside the dots)
  const LW = CONTRIBUTOR_RING_WIDTH;

  const radius_inner = (RADIUS_CONTRIBUTOR - LW / 3) * SF;
  const radius_outer = (RADIUS_CONTRIBUTOR + 2 * LW / 3) * SF;

  context.save();

  // Draw filled ring using winding rule:
  // - Outer arc drawn clockwise (default)
  // - Inner arc drawn counterclockwise (true) creates the "hole"
  context.beginPath();
  context.moveTo(center_x + radius_outer, center_y);
  context.arc(center_x, center_y, radius_outer, 0, TAU);        // Outer boundary (clockwise)
  context.moveTo(center_x + radius_inner, center_y);
  context.arc(center_x, center_y, radius_inner, 0, TAU, true);  // Inner boundary (counterclockwise = hole)

  // Fill with semi-transparent orange (matches original implementation)
  context.fillStyle = COLOR_RING;
  context.globalAlpha = 0.05;
  context.fill();

  context.restore();
}
