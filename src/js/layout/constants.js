/**
 * Layout constants
 * @module layout/constants
 */

/**
 * Default size for the visualization canvas
 */
export const DEFAULT_SIZE = 1500;

/**
 * Layout configuration constants
 */
export const LAYOUT = {
  centralRadius: 35, // The radius of the central repository node
  innerRadiusFactor: 0.7, // The factor of RADIUS_CONTRIBUTOR outside of which inner repos are not allowed to go
  maxContributorWidth: 55, // The maximum width (at SF = 1) of the contributor name before it gets wrapped
  defaultSize: 1500, // Default canvas size
};
