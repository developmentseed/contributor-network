/**
 * Filter state management
 * @module state/filterState
 */

/**
 * Creates a new filter state object
 * @returns {Object} Filter state with organizations array and metric thresholds
 */
export function createFilterState() {
  return {
    organizations: [], // e.g., ["developmentseed", "stac-utils"]
    starsMin: null, // Minimum stars threshold (null = no filter)
    forksMin: null, // Minimum forks threshold (null = no filter)
  };
}

/**
 * Adds an organization to the active filters
 * @param {Object} state - The filter state object
 * @param {string} org - Organization name to add
 * @returns {Object} Updated filter state
 */
export function addOrganization(state, org) {
  if (!state.organizations.includes(org)) {
    state.organizations.push(org);
  }
  return state;
}

/**
 * Removes an organization from the active filters
 * @param {Object} state - The filter state object
 * @param {string} org - Organization name to remove
 * @returns {Object} Updated filter state
 */
export function removeOrganization(state, org) {
  state.organizations = state.organizations.filter(o => o !== org);
  return state;
}

/**
 * Sets a numeric metric filter (e.g., starsMin, forksMin)
 * @param {Object} state - The filter state object
 * @param {string} metric - Metric name ('starsMin' or 'forksMin')
 * @param {number|null} value - Minimum threshold value, or null to clear
 * @returns {Object} Updated filter state
 */
export function setMetricFilter(state, metric, value) {
  if (metric === 'starsMin' || metric === 'forksMin') {
    state[metric] = value;
  }
  return state;
}

/**
 * Clears all active filters
 * @param {Object} state - The filter state object
 * @returns {Object} Updated filter state with empty organizations array and null metrics
 */
export function clearFilters(state) {
  state.organizations = [];
  state.starsMin = null;
  state.forksMin = null;
  return state;
}

/**
 * Checks if an organization is currently filtered
 * @param {Object} state - The filter state object
 * @param {string} org - Organization name to check
 * @returns {boolean} True if organization is in the filter list
 */
export function hasOrganization(state, org) {
  return state.organizations.includes(org);
}

/**
 * Checks if any filters are currently active
 * @param {Object} state - The filter state object
 * @returns {boolean} True if any filters are active
 */
export function hasActiveFilters(state) {
  return (
    state.organizations.length > 0 ||
    state.starsMin !== null ||
    state.forksMin !== null
  );
}
