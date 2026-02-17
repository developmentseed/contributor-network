/**
 * Repository Details Card Rendering
 *
 * Renders the hover/click details card for repository nodes.
 * Displays metadata like stars, forks, watchers, languages,
 * and community health metrics.
 *
 * @module render/repoCard
 */

import { setFont, renderText } from './text.js';
import { min } from '../utils/helpers.js';

/**
 * Default configuration for repo card rendering
 */
export const REPO_CARD_CONFIG = {
  lineHeight: 1.4,
  sectionSpacing: 24, // Balanced spacing (scaled up for larger font sizes)
  labelFontSize: 14,
  valueFontSize: 14,
  headerFontSize: 15,
  labelOpacity: 0.6,
  valueOpacity: 0.9,
  warningOpacity: 0.7,
};

/**
 * Format a number for display (e.g., 1234 -> "1.2K")
 * @param {number} num - The number to format
 * @param {function} formatDigit - D3 format function
 * @returns {string} Formatted number
 */
function formatNumber(num, formatDigit) {
  return num < 10 ? String(num) : formatDigit(num);
}

/**
 * Get community health label based on ratio
 * @param {number} ratio - Community ratio (0-1)
 * @returns {string} Health label
 */
export function getCommunityHealthLabel(ratio) {
  const percent = Math.round(ratio * 100);
  if (percent >= 70) return 'Strong';
  if (percent >= 40) return 'Moderate';
  return 'Growing';
}

/**
 * Render the stars, forks, and watchers line
 * @param {CanvasRenderingContext2D} context - Canvas context
 * @param {Object} data - Repository data
 * @param {number} x - X position
 * @param {number} y - Y position
 * @param {number} SF - Scale factor
 * @param {function} formatDigit - D3 format function
 * @returns {number} New Y position after rendering
 */
export function renderStatsLine(context, data, x, y, SF, formatDigit) {
  const config = REPO_CARD_CONFIG;

  setFont(context, config.headerFontSize * SF, 400, 'normal');
  context.globalAlpha = 1;

  const stars = formatNumber(data.stars, formatDigit);
  const forks = formatNumber(data.forks, formatDigit);
  const watchers = formatNumber(data.watchers || 0, formatDigit);

  renderText(
    context,
    `${stars} stars | ${forks} forks | ${watchers} watchers`,
    x * SF,
    y * SF,
    1.25 * SF
  );

  return y;
}

/**
 * Render the languages section
 * @param {CanvasRenderingContext2D} context - Canvas context
 * @param {Object} data - Repository data
 * @param {number} x - X position
 * @param {number} y - Y position
 * @param {number} SF - Scale factor
 * @returns {number} New Y position after rendering
 */
export function renderLanguages(context, data, x, y, SF) {
  const config = REPO_CARD_CONFIG;

  if (!data.languages || data.languages.length === 0) {
    return y;
  }

  y += config.sectionSpacing;

  // Section label
  context.globalAlpha = config.labelOpacity;
  setFont(context, config.labelFontSize * SF, 400, 'italic');
  renderText(context, 'Languages', x * SF, y * SF, 2 * SF);

  // Language values
  y += config.valueFontSize * config.lineHeight + 4;
  context.globalAlpha = config.valueOpacity;
  setFont(context, config.valueFontSize * SF, 400, 'normal');

  let text = '';
  const maxLanguages = min(3, data.languages.length);
  for (let i = 0; i < maxLanguages; i++) {
    text += `${data.languages[i]}${i < maxLanguages - 1 ? ', ' : ''}`;
  }
  renderText(context, text, x * SF, y * SF, 1.25 * SF);

  // "& X more" if needed
  if (data.languages.length > 3) {
    y += config.valueFontSize * config.lineHeight;
    renderText(context, `& ${data.languages.length - 3} more`, x * SF, y * SF, 1.25 * SF);
    y += config.valueFontSize * config.lineHeight; // Increment after last line
  } else {
    y += config.valueFontSize * config.lineHeight; // Increment after value line
  }

  return y;
}

/**
 * Render the community metrics section
 * @param {CanvasRenderingContext2D} context - Canvas context
 * @param {Object} data - Repository data
 * @param {number} x - X position
 * @param {number} y - Y position
 * @param {number} SF - Scale factor
 * @returns {number} New Y position after rendering
 */
export function renderCommunityMetrics(context, data, x, y, SF) {
  const config = REPO_CARD_CONFIG;

  // Skip if no contributor data
  if (!data.totalContributors || data.totalContributors === 0) {
    return y;
  }

  y += config.sectionSpacing;

  // Section label
  context.globalAlpha = config.labelOpacity;
  setFont(context, config.labelFontSize * SF, 400, 'italic');
  renderText(context, 'Community', x * SF, y * SF, 2 * SF);

  // Contributor counts
  y += config.valueFontSize * config.lineHeight + 4;
  context.globalAlpha = config.valueOpacity;
  setFont(context, config.valueFontSize * SF, 400, 'normal');

  const total = data.totalContributors;
  const core = data.coreContributors || 0;
  const external = data.externalContributors || 0;

  renderText(
    context,
    `${total} contributors (${core} core, ${external} community)`,
    x * SF,
    y * SF,
    1.25 * SF
  );

  // Community health score
  y += config.valueFontSize * config.lineHeight;
  const ratio = data.communityRatio || 0;
  const healthPercent = Math.round(ratio * 100);
  const healthLabel = getCommunityHealthLabel(ratio);

  renderText(
    context,
    `Community Health: ${healthPercent}% (${healthLabel})`,
    x * SF,
    y * SF,
    1.25 * SF
  );

  // Bus factor warning
  if (core === 1 && total > 0) {
    y += config.valueFontSize * config.lineHeight;
    context.globalAlpha = config.warningOpacity;
    setFont(context, config.valueFontSize * SF, 400, 'italic');
    renderText(context, '⚠ Single core maintainer', x * SF, y * SF, 1.25 * SF);
    context.globalAlpha = config.valueOpacity;
    setFont(context, config.valueFontSize * SF, 400, 'normal');
    y += config.valueFontSize * config.lineHeight; // Increment after warning line
  } else {
    y += config.valueFontSize * config.lineHeight; // Increment after health line
  }

  return y;
}

/**
 * Render forking organizations section
 * @param {CanvasRenderingContext2D} context - Canvas context
 * @param {Object} data - Repository data
 * @param {number} x - X position
 * @param {number} y - Y position
 * @param {number} SF - Scale factor
 * @returns {number} New Y position after rendering
 */
export function renderForkingOrganizations(context, data, x, y, SF) {
  const config = REPO_CARD_CONFIG;

  if (!data.forkingOrganizations || data.forkingOrganizations.length === 0) {
    return y;
  }

  y += config.sectionSpacing;

  // Section label
  context.globalAlpha = config.labelOpacity;
  setFont(context, config.labelFontSize * SF, 400, 'italic');
  renderText(context, 'Forked by Organizations', x * SF, y * SF, 2 * SF);

  // Organization names
  y += config.valueFontSize * config.lineHeight + 4;
  context.globalAlpha = config.valueOpacity;
  setFont(context, config.valueFontSize * SF, 400, 'normal');

  const maxOrgs = min(3, data.forkingOrganizations.length);
  let text = '';
  for (let i = 0; i < maxOrgs; i++) {
    text += `${data.forkingOrganizations[i]}${i < maxOrgs - 1 ? ', ' : ''}`;
  }
  renderText(context, text, x * SF, y * SF, 1.25 * SF);

  // "& X more" if needed
  if (data.forkingOrganizations.length > 3) {
    y += config.valueFontSize * config.lineHeight;
    renderText(context, `& ${data.forkingOrganizations.length - 3} more`, x * SF, y * SF, 1.25 * SF);
    y += config.valueFontSize * config.lineHeight;
  } else {
    y += config.valueFontSize * config.lineHeight;
  }

  return y;
}

/**
 * Render license badge if available
 * @param {CanvasRenderingContext2D} context - Canvas context
 * @param {Object} data - Repository data
 * @param {number} x - X position
 * @param {number} y - Y position
 * @param {number} SF - Scale factor
 * @returns {number} New Y position after rendering
 */
export function renderLicense(context, data, x, y, SF) {
  const config = REPO_CARD_CONFIG;

  if (!data.license) {
    return y;
  }

  y += config.sectionSpacing;
  context.globalAlpha = config.valueOpacity;
  setFont(context, config.valueFontSize * SF, 400, 'normal');
  renderText(context, `License: ${data.license}`, x * SF, y * SF, 1.25 * SF);
  y += config.valueFontSize * config.lineHeight; // Increment after license line

  return y;
}

/**
 * Render archived badge if repo is archived
 * @param {CanvasRenderingContext2D} context - Canvas context
 * @param {Object} data - Repository data
 * @param {number} x - X position
 * @param {number} y - Y position
 * @param {number} SF - Scale factor
 * @returns {number} New Y position after rendering
 */
export function renderArchivedBadge(context, data, x, y, SF) {
  const config = REPO_CARD_CONFIG;

  if (!data.archived) {
    return y;
  }

  y += config.sectionSpacing;
  context.globalAlpha = config.warningOpacity;
  setFont(context, config.valueFontSize * SF, 400, 'italic');
  renderText(context, '📦 Archived', x * SF, y * SF, 1.25 * SF);
  context.globalAlpha = config.valueOpacity;
  y += config.valueFontSize * config.lineHeight; // Increment after archived line

  return y;
}
