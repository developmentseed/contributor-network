/**
 * Theme Configuration
 *
 * Single source of truth for colors, sizes, and layout constants.
 * Import this module to access consistent styling across the visualization.
 *
 * @module config/theme
 */

/**
 * DevSeed brand colors and visualization palette
 */
export const COLORS = {
  // Brand colors
  grenadier: '#CF3F02',      // Signature orange
  aquamarine: '#2E86AB',     // Secondary blue
  aquamarineLight: '#3A9BBF', // Lighter aquamarine

  // Semantic colors for visualization
  background: '#f7f7f7',
  contributor: '#3A9BBF',     // Lighter aquamarine
  repo: '#2E86AB',            // Aquamarine (secondary blue)
  repoMain: '#CF3F02',        // Grenadier (central repo)
  owner: '#CF3F02',           // Grenadier
  link: '#e8e8e8',
  text: '#443F3F',            // Base dark gray
  accent: '#CF3F02',          // Grenadier for accent rings

  // Derived colors with opacity
  highlightFill: '#CF3F0230', // Grenadier at ~20% opacity
  shadow: '#f7f7f7',
  shadowDark: '#d4d4d4'
};

/**
 * Typography configuration
 */
export const FONTS = {
  family: 'Roboto',
  familyCondensed: 'Roboto Condensed',
  familyMono: 'Fira Code',

  // Font weights
  normal: 400,
  bold: 700,

  // Default sizes (scaled dynamically in visualization)
  baseSizeContributor: 11,
  baseSizeRepo: 10,
  baseSizeOwner: 12
};

/**
 * Size configuration for nodes and layout
 */
export const SIZES = {
  // Canvas dimensions (use LAYOUT.defaultSize instead)
  defaultCanvas: 1500,

  // Node radius ranges [min, max]
  contributorRadius: { min: 8, max: 30 },
  remainingContributorRadius: { min: 1, max: 8 },
  repoRadius: { min: 4, max: 20 },

  // Link dimensions
  linkWidth: { min: 1, mid: 2, max: 60 },
  linkDistance: { min: 10, max: 80 }
};

/**
 * Layout configuration for force simulation and visualization
 */
export const LAYOUT = {
  // Central node positioning
  centralRadius: 35,  // The radius of the central repository node
  innerRadiusFactor: 0.7,  // The factor of RADIUS_CONTRIBUTOR outside of which inner repos are not allowed to go

  // Contributor ring positioning
  contributorPadding: 20,  // Default, overridden by config
  maxContributorWidth: 55,  // The maximum width (at SF = 1) of the contributor name before it gets wrapped

  // Canvas sizing
  defaultSize: 1500,  // Default canvas size

  // Force simulation parameters
  linkDistanceDomain: [1, 50],
  linkWidthExponent: 0.75,

  // Collision detection
  bboxPadding: 2
};

/**
 * Animation and interaction timing
 */
export const TIMING = {
  // Hover delay before showing tooltip
  hoverDelay: 100,

  // Resize debounce
  resizeDebounce: 300,

  // Force simulation
  simulationAlpha: 0.3,
  simulationAlphaDecay: 0.02
};

/**
 * Export a single theme object for convenience
 */
export const THEME = {
  colors: COLORS,
  fonts: FONTS,
  sizes: SIZES,
  layout: LAYOUT,
  timing: TIMING
};

export default THEME;
