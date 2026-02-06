/**
 * Filter state management
 * @module state/filterState
 */

/**
 * Creates a new filter state object
 * @returns {Object} Filter state with organizations array
 */
export function createFilterState() {
  return {
    organizations: [], // e.g., ["developmentseed", "stac-utils"]
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
 * Clears all active filters
 * @param {Object} state - The filter state object
 * @returns {Object} Updated filter state with empty organizations array
 */
export function clearFilters(state) {
  state.organizations = [];
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
  return state.organizations.length > 0;
}
