/**
 * Contributor Network Visualization - Main Entry Point
 *
 * This module re-exports the visualization and its dependencies.
 * It serves as the public API for the contributor network.
 *
 * @module contributor-network
 */

// Data utilities
export {
  applyFilters,
  createFilterManager,
  deepClone,
  getRepoOwner,
  filterReposByOrganization,
  filterLinksByRepos,
  filterLinksByContributors,
  filterContributorsByLinks
} from './data/filter.js';

// Theme and configuration
export {
  THEME,
  COLORS,
  FONTS,
  SIZES,
  LAYOUT,
  TIMING,
  createScales
} from './config/theme.js';

/**
 * Version of the modular contributor network
 */
export const VERSION = '2.0.0';
