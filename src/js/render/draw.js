/**
 * Main Drawing Module
 *
 * Orchestrates the rendering of the entire visualization by calling
 * the appropriate render functions for links, nodes, and labels.
 *
 * @module render/draw
 */

import { drawContributorRing } from './shapes.js';

/**
 * Safely execute a render function with error handling
 * @param {Function} renderFn - The render function to execute
 * @param {string} fnName - Name of the function (for error messages)
 * @param {...*} args - Arguments to pass to the render function
 * @returns {boolean} - True if successful, false if error occurred
 */
function safeRender(renderFn, fnName, ...args) {
  try {
    renderFn(...args);
    return true;
  } catch (error) {
    console.error(`Error in ${fnName}:`, error);
    return false;
  }
}

/**
 * Check if a node has valid, finite coordinates for rendering
 * @param {Object} node - Node to validate
 * @returns {boolean} - True if node has valid coordinates
 */
function hasValidCoordinates(node) {
  return (
    node &&
    typeof node.x === 'number' &&
    typeof node.y === 'number' &&
    isFinite(node.x) &&
    isFinite(node.y)
  );
}

/**
 * Draw the complete visualization
 *
 * This function orchestrates the rendering of:
 * - Background fill
 * - Links between nodes
 * - Node arcs (time range indicators)
 * - Node circles
 * - Node labels
 *
 * Rendering order is important for visual layering:
 * 1. Links (bottom layer)
 * 2. Node arcs (time indicators, behind nodes)
 * 3. Node circles (main visual)
 * 4. Labels (top layer)
 *
 * @param {Object} context - Canvas 2D rendering context
 * @param {Object} data - Visualization data:
 *   - nodes: Array of all nodes
 *   - links: Array of all links
 *   - nodes_central: Array of central nodes (for label rendering)
 * @param {Object} config - Configuration:
 *   - WIDTH: Canvas width
 *   - HEIGHT: Canvas height
 *   - SF: Scale factor
 *   - COLOR_BACKGROUND: Background color
 *   - REPO_CENTRAL: Central repository identifier
 * @param {Object} renderFunctions - Render function wrappers:
 *   - drawLink: Function to draw a link
 *   - drawNodeArc: Function to draw node arc
 *   - drawNode: Function to draw a node circle
 *   - drawNodeLabel: Function to draw a node label
 * @returns {void}
 */
export function draw(context, data, config, renderFunctions) {
  const { nodes, links, nodes_central } = data;
  const { WIDTH, HEIGHT, SF, COLOR_BACKGROUND, REPO_CENTRAL, RADIUS_CONTRIBUTOR, CONTRIBUTOR_RING_WIDTH } = config;
  const { drawLink, drawNodeArc, drawNode, drawNodeLabel } = renderFunctions;

  // ============================================================
  // Input Validation
  // ============================================================
  if (WIDTH === 0 || HEIGHT === 0) {
    console.warn('draw() called with invalid canvas size:', { WIDTH, HEIGHT, SF });
    return;
  }
  if (!Array.isArray(nodes) || nodes.length === 0) {
    console.warn('draw() called with no nodes');
    return;
  }

  // Validate render functions
  if (typeof drawLink !== 'function') {
    console.error('draw(): drawLink must be a function');
    return;
  }
  if (typeof drawNodeArc !== 'function') {
    console.error('draw(): drawNodeArc must be a function');
    return;
  }
  if (typeof drawNode !== 'function') {
    console.error('draw(): drawNode must be a function');
    return;
  }
  if (typeof drawNodeLabel !== 'function') {
    console.error('draw(): drawNodeLabel must be a function');
    return;
  }

  // ============================================================
  // Pre-filter nodes for efficiency
  // ============================================================
  // Filter nodes once, reuse for multiple rendering passes
  const renderableNodes = nodes.filter((d) => {
    if (d.id === REPO_CENTRAL) return false; // Skip central pseudo-node
    if (!hasValidCoordinates(d)) {
      console.warn(`Skipping node with invalid coordinates: ${d.id}`);
      return false;
    }
    return true;
  });

  // ============================================================
  // Background
  // ============================================================
  context.fillStyle = COLOR_BACKGROUND;
  context.fillRect(0, 0, WIDTH, HEIGHT);

  // Note: Translation to center is handled by the caller (via zoom transform)
  // The context should already be translated and scaled by the time this function is called
  context.save();

  // ============================================================
  // Layer 1: Links (bottom layer)
  // ============================================================
  // Draw all the links as lines (skip links to/from the central pseudo-node)
  links.forEach((l) => {
    // Skip drawing links that connect directly to the central "team" node
    const targetId = l.target.id || l.target;
    const sourceId = l.source.id || l.source;
    if (targetId === REPO_CENTRAL || sourceId === REPO_CENTRAL) return;

    // Validate that both nodes exist and have finite coordinates
    if (hasValidCoordinates(l.source) && hasValidCoordinates(l.target)) {
      safeRender(drawLink, 'drawLink', context, SF, l);
    }
  });

  // ============================================================
  // Layer 1.5: Contributor Ring (filled ring band)
  // ============================================================
  // Draw the contributor ring as a semi-transparent orange band
  // where contributor nodes are positioned (matches original ORCA visualization)
  const central_repo = nodes.find(d => d.id === REPO_CENTRAL);
  if (central_repo && RADIUS_CONTRIBUTOR && CONTRIBUTOR_RING_WIDTH) {
    safeRender(
      drawContributorRing,
      'drawContributorRing',
      context,
      SF,
      RADIUS_CONTRIBUTOR,
      CONTRIBUTOR_RING_WIDTH,
      central_repo
      // Uses default color: Grenadier orange (#CF3F02) at 5% opacity
    );
  }

  // ============================================================
  // Layer 2: Node Arcs (time range indicators)
  // ============================================================
  // Arcs must be drawn before circles so they appear behind
  renderableNodes.forEach((d) => {
    safeRender(drawNodeArc, 'drawNodeArc', context, SF, d);
  });

  // ============================================================
  // Layer 3: Node Circles
  // ============================================================
  renderableNodes.forEach((d) => {
    safeRender(drawNode, 'drawNode', context, SF, d);
  });

  // ============================================================
  // Layer 4: Labels (top layer)
  // ============================================================
  // Use nodes_central for labels (may include additional filtering)
  const labelNodes = nodes_central || nodes;
  labelNodes.forEach((d) => {
    if (d.id === REPO_CENTRAL) return;
    if (!hasValidCoordinates(d)) return;
    safeRender(drawNodeLabel, 'drawNodeLabel', context, d);
  });

  context.restore();
}
