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
  lineHeight: 1.6,
  sectionSpacing: 34,
  labelFontSize: 16,
  valueFontSize: 16,
  headerFontSize: 18,
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
 * Draws a GitHub-style git fork icon (3 nodes connected in an inverted Y).
 * @param {CanvasRenderingContext2D} context
 * @param {number} x - Left edge of icon bounding box (canvas pixels)
 * @param {number} cy - Vertical center of icon (canvas pixels)
 * @param {number} r - Node circle radius (canvas pixels)
 * @param {string} color - Fill/stroke color
 */
function drawForkIcon(context, x, cy, r, color) {
  context.save();
  context.fillStyle = color;
  context.strokeStyle = color;
  context.lineWidth = r * 0.65;
  context.lineCap = 'round';

  const tlx = x + r,     tly = cy - r * 2;
  const trx = x + r * 5, try_ = cy - r * 2;
  const bx  = x + r * 3, by  = cy + r * 2;

  context.beginPath();
  context.moveTo(tlx, tly + r);
  context.lineTo(bx, by - r);
  context.stroke();

  context.beginPath();
  context.moveTo(trx, try_ + r);
  context.lineTo(bx, by - r);
  context.stroke();

  for (const [px, py] of [[tlx, tly], [trx, try_], [bx, by]]) {
    context.beginPath();
    context.arc(px, py, r, 0, Math.PI * 2);
    context.fill();
  }

  context.restore();
}

/**
 * Draws a simple eye icon (almond outline + pupil).
 * @param {CanvasRenderingContext2D} context
 * @param {number} x - Left edge of icon bounding box (canvas pixels)
 * @param {number} cy - Vertical center of icon (canvas pixels)
 * @param {number} w - Half-width of the eye (canvas pixels)
 * @param {number} h - Bezier amplitude / half-height control (canvas pixels)
 * @param {string} color - Fill/stroke color
 */
function drawEyeIcon(context, x, cy, w, h, color) {
  context.save();
  context.fillStyle = color;
  context.strokeStyle = color;
  context.lineWidth = h * 0.45;
  context.lineCap = 'round';
  context.lineJoin = 'round';

  context.beginPath();
  context.moveTo(x, cy);
  context.bezierCurveTo(x + w * 0.5, cy - h * 1.5, x + w * 1.5, cy - h * 1.5, x + w * 2, cy);
  context.bezierCurveTo(x + w * 1.5, cy + h * 1.5, x + w * 0.5, cy + h * 1.5, x, cy);
  context.stroke();

  context.beginPath();
  context.arc(x + w, cy, h * 0.6, 0, Math.PI * 2);
  context.fill();

  context.restore();
}

/**
 * Render the stars, forks, and watchers line with drawn icons.
 * @param {CanvasRenderingContext2D} context - Canvas context
 * @param {Object} data - Repository data
 * @param {number} x - X position (logical pixels, left-aligned)
 * @param {number} y - Y position (logical pixels)
 * @param {number} SF - Scale factor
 * @param {function} formatDigit - D3 format function
 * @returns {number} Unchanged Y position (stats line doesn't advance y)
 */
export function renderStatsLine(context, data, x, y, SF, formatDigit) {
  const config = REPO_CARD_CONFIG;
  const fontSize = config.headerFontSize;

  setFont(context, fontSize * SF, 400, 'normal');
  context.globalAlpha = 1;

  const color = context.fillStyle;
  const r    = fontSize * 0.18 * SF;   // fork node radius
  const eyeW = fontSize * 0.55 * SF;   // eye half-width
  const eyeH = fontSize * 0.35 * SF;   // eye bezier amplitude
  const iconGap = 8 * SF;
  const statGap = 28 * SF;

  let cx = x * SF;
  const cy = y * SF;

  // Stars: ★ icon (text) + count
  const [, starEnd] = renderText(context, '★', cx, cy, 1.25 * SF);
  cx = starEnd + iconGap;
  const [, starsNumEnd] = renderText(context, formatNumber(data.stars, formatDigit), cx, cy, 1.25 * SF);
  cx = starsNumEnd + statGap;

  // Forks: drawn fork icon + count
  drawForkIcon(context, cx, cy, r, color);
  cx += r * 6 + iconGap;
  const [, forksNumEnd] = renderText(context, formatNumber(data.forks, formatDigit), cx, cy, 1.25 * SF);
  cx = forksNumEnd + statGap;

  // Watchers: drawn eye icon + count
  drawEyeIcon(context, cx, cy, eyeW, eyeH, color);
  cx += eyeW * 2 + iconGap;
  renderText(context, formatNumber(data.watchers || 0, formatDigit), cx, cy, 1.25 * SF);

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
    y += config.valueFontSize * config.lineHeight;
  } else {
    y += config.valueFontSize * config.lineHeight;
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
  const devseed = data.devseedContributors || 0;
  const external = data.externalContributors || 0;

  renderText(
    context,
    `${total} contributors (${devseed} DevSeed, ${external} community)`,
    x * SF,
    y * SF,
    1.25 * SF
  );

  // Bus factor warning (single DevSeed maintainer)
  if (devseed === 1 && total > 0) {
    y += config.valueFontSize * config.lineHeight;
    context.globalAlpha = config.warningOpacity;
    setFont(context, config.valueFontSize * SF, 400, 'italic');
    renderText(context, '⚠ Single DevSeed maintainer', x * SF, y * SF, 1.25 * SF);
    context.globalAlpha = config.valueOpacity;
    setFont(context, config.valueFontSize * SF, 400, 'normal');
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
  y += config.valueFontSize * config.lineHeight;

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
  y += config.valueFontSize * config.lineHeight;

  return y;
}
