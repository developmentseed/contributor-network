/**
 * Hover and click state management
 * @module state/interactionState
 */

/**
 * Creates a new interaction state object
 * @returns {Object} Interaction state with hover, click, and delaunay properties
 */
export function createInteractionState() {
  return {
    hoverActive: false,
    hoveredNode: null,
    clickActive: false,
    clickedNode: null,
    delaunay: null,
    nodesDelaunay: null,
  };
}

/**
 * Sets the hovered node state
 * @param {Object} state - The interaction state object
 * @param {Object|null} node - The node being hovered, or null to clear hover
 * @returns {Object} Updated interaction state
 */
export function setHovered(state, node) {
  state.hoverActive = !!node;
  state.hoveredNode = node;
  return state;
}

/**
 * Clears the hover state
 * @param {Object} state - The interaction state object
 * @returns {Object} Updated interaction state
 */
export function clearHover(state) {
  state.hoverActive = false;
  state.hoveredNode = null;
  return state;
}

/**
 * Sets the clicked node state
 * @param {Object} state - The interaction state object
 * @param {Object|null} node - The node being clicked, or null to clear click
 * @returns {Object} Updated interaction state
 */
export function setClicked(state, node) {
  state.clickActive = !!node;
  state.clickedNode = node;
  return state;
}

/**
 * Clears the click state
 * @param {Object} state - The interaction state object
 * @returns {Object} Updated interaction state
 */
export function clearClick(state) {
  state.clickActive = false;
  state.clickedNode = null;
  return state;
}

/**
 * Clears all interaction state (hover and click)
 * @param {Object} state - The interaction state object
 * @returns {Object} Updated interaction state
 */
export function clearAll(state) {
  state.hoverActive = false;
  state.hoveredNode = null;
  state.clickActive = false;
  state.clickedNode = null;
  return state;
}

/**
 * Sets the Delaunay triangulation data
 * @param {Object} state - The interaction state object
 * @param {Object} delaunay - The Delaunay triangulation object
 * @param {Array} nodesDelaunay - The nodes used for Delaunay triangulation
 * @returns {Object} Updated interaction state
 */
export function setDelaunay(state, delaunay, nodesDelaunay) {
  state.delaunay = delaunay;
  state.nodesDelaunay = nodesDelaunay;
  return state;
}

/**
 * Clears the Delaunay triangulation data
 * @param {Object} state - The interaction state object
 * @returns {Object} Updated interaction state
 */
export function clearDelaunay(state) {
  state.delaunay = null;
  state.nodesDelaunay = null;
  return state;
}
