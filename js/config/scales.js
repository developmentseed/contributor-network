/**
 * D3 Scale Configurations
 *
 * Factory functions for creating D3 scales used in the visualization.
 * Scales are configured based on the theme but require D3 to be passed in.
 *
 * @module config/scales
 */

import { SIZES, LAYOUT } from './theme.js';

/**
 * Create the repository radius scale.
 * Maps repository size/importance to visual radius.
 *
 * @param {Object} d3 - D3 library reference
 * @returns {Function} D3 scale function
 */
export function createRepoRadiusScale(d3) {
  return d3.scaleSqrt()
    .range([SIZES.repoRadius.min, SIZES.repoRadius.max]);
}

/**
 * Create the contributor radius scale.
 * Maps contributor commit count to visual radius.
 *
 * @param {Object} d3 - D3 library reference
 * @returns {Function} D3 scale function
 */
export function createContributorRadiusScale(d3) {
  return d3.scaleSqrt()
    .range([SIZES.contributorRadius.min, SIZES.contributorRadius.max]);
}

/**
 * Create the link distance scale.
 * Maps connection strength to link length.
 *
 * @param {Object} d3 - D3 library reference
 * @returns {Function} D3 scale function
 */
export function createLinkDistanceScale(d3) {
  return d3.scaleLinear()
    .domain(LAYOUT.linkDistanceDomain)
    .range([SIZES.linkDistance.min, SIZES.linkDistance.max]);
}

/**
 * Create the link width scale.
 * Maps connection strength to visual width.
 *
 * @param {Object} d3 - D3 library reference
 * @returns {Function} D3 scale function
 */
export function createLinkWidthScale(d3) {
  return d3.scalePow()
    .exponent(LAYOUT.linkWidthExponent)
    .range([SIZES.linkWidth.min, SIZES.linkWidth.mid, SIZES.linkWidth.max]);
}

/**
 * Create all visualization scales.
 *
 * @param {Object} d3 - D3 library reference
 * @returns {Object} Object containing all scales
 */
export function createAllScales(d3) {
  return {
    repoRadius: createRepoRadiusScale(d3),
    contributorRadius: createContributorRadiusScale(d3),
    linkDistance: createLinkDistanceScale(d3),
    linkWidth: createLinkWidthScale(d3)
  };
}

/**
 * Update scale domains based on data.
 *
 * @param {Object} scales - Scales object from createAllScales
 * @param {Object} data - Data to derive domains from
 * @param {Array} data.repos - Repository data
 * @param {Array} data.contributors - Contributor data
 * @param {Array} data.links - Link data
 */
export function updateScaleDomains(scales, data) {
  const { repos = [], contributors = [], links = [] } = data;

  // Update repo radius domain based on star count or similar metric
  if (repos.length > 0) {
    const repoMetric = repos.map(r => r.stars || r.forks || 1);
    scales.repoRadius.domain([0, Math.max(...repoMetric)]);
  }

  // Update contributor radius domain based on commit count
  if (contributors.length > 0) {
    const contributorMetric = contributors.map(c => c.total_commits || c.commits || 1);
    scales.contributorRadius.domain([0, Math.max(...contributorMetric)]);
  }

  // Update link width domain based on commit count
  if (links.length > 0) {
    const linkMetric = links.map(l => l.commit_count || 1);
    scales.linkWidth.domain([0, Math.max(...linkMetric)]);
  }

  return scales;
}
