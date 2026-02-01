/**
 * Contributor Network Visualization - Main Entry Point
 *
 * This module re-exports the visualization components and utilities.
 * It serves as the public API for the contributor network.
 *
 * @module contributor-network
 */

// ============================================================
// Configuration
// ============================================================

export {
  THEME,
  COLORS,
  FONTS,
  SIZES,
  LAYOUT,
  TIMING,
  createScales
} from './config/theme.js';

export {
  createAllScales,
  createRepoRadiusScale,
  createContributorRadiusScale,
  createLinkDistanceScale,
  createLinkWidthScale,
  updateScaleDomains
} from './config/scales.js';

// ============================================================
// Data Utilities
// ============================================================

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

// ============================================================
// Utility Functions
// ============================================================

export {
  PI,
  TAU,
  mod,
  sq,
  isInteger,
  clamp,
  lerp,
  distance,
  toRadians,
  toDegrees,
  round,
  cos,
  sin,
  min,
  max,
  sqrt,
  abs,
  floor,
  ceil
} from './utils/helpers.js';

export {
  VALID_NODE_TYPES,
  isValidNode,
  isValidLink,
  getLinkNodeId,
  isPositioned,
  filterValidNodes,
  filterValidLinks,
  resolveLinkReferences
} from './utils/validation.js';

export {
  isDebugEnabled,
  enableDebug,
  disableDebug,
  debugLog,
  debugWarn,
  debugError,
  debugGroup,
  debugTime,
  createLogger
} from './utils/debug.js';

export {
  DATE_FORMATS,
  createDateFormatters,
  createNumberFormatters,
  createFormatters,
  formatDateRange,
  formatCommitCount,
  formatRepoCount,
  formatContributorCount
} from './utils/formatters.js';

// ============================================================
// Rendering
// ============================================================

export {
  CANVAS_DEFAULTS,
  createCanvas,
  styleCanvas,
  styleBackgroundCanvas,
  styleHoverCanvas,
  styleContainer,
  setCanvasSize,
  scaleContext,
  clearCanvas,
  fillCanvas,
  createCanvasStack,
  resizeCanvasStack,
  getPixelRatio,
  calculateScaleFactor
} from './render/canvas.js';

export {
  setFont,
  setRepoFont,
  setCentralRepoFont,
  setOwnerFont,
  setContributorFont,
  renderText,
  getLines,
  splitString,
  drawTextAlongArc,
  measureText,
  drawMultilineText
} from './render/text.js';

export {
  REPO_CARD_CONFIG,
  getCommunityHealthLabel,
  renderStatsLine,
  renderLanguages,
  renderCommunityMetrics,
  renderContributorCommitInfo,
  renderLicense,
  renderArchivedBadge
} from './render/repoCard.js';

// ============================================================
// Version
// ============================================================

/**
 * Version of the modular contributor network
 */
export const VERSION = '2.0.0';

/**
 * Build timestamp
 */
export const BUILD_DATE = '2025-01-31';
