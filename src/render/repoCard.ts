/**
 * Repository Details Card Rendering
 *
 * Renders the hover/click details card for repository nodes.
 * Displays metadata like stars, forks, watchers, languages,
 * and community health metrics.
 *
 * @module render/repoCard
 */

import { setFont, renderText } from './text';
import { min } from '../utils/helpers';

interface RepoCardConfig {
  lineHeight: number;
  sectionSpacing: number;
  labelFontSize: number;
  valueFontSize: number;
  headerFontSize: number;
  labelOpacity: number;
  valueOpacity: number;
  warningOpacity: number;
}

export interface RepoCardData {
  stars: number;
  forks: number;
  watchers?: number;
  languages?: string[];
  totalContributors?: number;
  orgContributors?: number;
  externalContributors?: number;
  communityRatio?: number;
  totalCommits?: number;
  orgCommits?: number;
  license?: string | null;
  archived?: boolean;
  [key: string]: unknown;
}

/**
 * Default configuration for repo card rendering.
 */
export const REPO_CARD_CONFIG: RepoCardConfig = {
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
 * Format a number for display (e.g., 1234 -> "1.2K").
 */
function formatNumber(num: number, formatDigit: (value: number) => string): string {
  return num < 10 ? String(num) : formatDigit(num);
}

/**
 * Get community health label based on ratio.
 */
export function getCommunityHealthLabel(ratio: number): string {
  const percent = Math.round(ratio * 100);
  if (percent >= 70) return 'Strong';
  if (percent >= 40) return 'Moderate';
  return 'Growing';
}

/**
 * Draws a GitHub-style git fork icon (3 nodes connected in an inverted Y).
 */
function drawForkIcon(
  context: CanvasRenderingContext2D,
  x: number,
  cy: number,
  r: number,
  color: string,
): void {
  context.save();
  context.fillStyle = color;
  context.strokeStyle = color;
  context.lineWidth = r * 0.65;
  context.lineCap = 'round';

  const tlx = x + r,
    tly = cy - r * 2;
  const trx = x + r * 5,
    try_ = cy - r * 2;
  const bx = x + r * 3,
    by = cy + r * 2;

  context.beginPath();
  context.moveTo(tlx, tly + r);
  context.lineTo(bx, by - r);
  context.stroke();

  context.beginPath();
  context.moveTo(trx, try_ + r);
  context.lineTo(bx, by - r);
  context.stroke();

  for (const [px, py] of [
    [tlx, tly],
    [trx, try_],
    [bx, by],
  ]) {
    context.beginPath();
    context.arc(px, py, r, 0, Math.PI * 2);
    context.fill();
  }

  context.restore();
}

/**
 * Draws a simple eye icon (almond outline + pupil).
 */
function drawEyeIcon(
  context: CanvasRenderingContext2D,
  x: number,
  cy: number,
  w: number,
  h: number,
  color: string,
): void {
  context.save();
  context.fillStyle = color;
  context.strokeStyle = color;
  context.lineWidth = h * 0.45;
  context.lineCap = 'round';
  context.lineJoin = 'round';

  context.beginPath();
  context.moveTo(x, cy);
  context.bezierCurveTo(
    x + w * 0.5,
    cy - h * 1.5,
    x + w * 1.5,
    cy - h * 1.5,
    x + w * 2,
    cy,
  );
  context.bezierCurveTo(
    x + w * 1.5,
    cy + h * 1.5,
    x + w * 0.5,
    cy + h * 1.5,
    x,
    cy,
  );
  context.stroke();

  context.beginPath();
  context.arc(x + w, cy, h * 0.6, 0, Math.PI * 2);
  context.fill();

  context.restore();
}

/**
 * Render the stars, forks, and watchers line with drawn icons.
 */
export function renderStatsLine(
  context: CanvasRenderingContext2D,
  data: RepoCardData,
  x: number,
  y: number,
  SF: number,
  formatDigit: (value: number) => string,
): number {
  const config = REPO_CARD_CONFIG;
  const fontSize = config.headerFontSize;

  setFont(context, fontSize * SF, 400, 'normal');
  context.globalAlpha = 1;

  const color = context.fillStyle as string;
  const r = fontSize * 0.18 * SF;
  const eyeW = fontSize * 0.55 * SF;
  const eyeH = fontSize * 0.35 * SF;
  const iconGap = 8 * SF;
  const statGap = 28 * SF;

  let cx = x * SF;
  const cy = y * SF;

  const [, starEnd] = renderText(context, '★', cx, cy, 1.25 * SF);
  cx = starEnd + iconGap;
  const [, starsNumEnd] = renderText(
    context,
    formatNumber(data.stars, formatDigit),
    cx,
    cy,
    1.25 * SF,
  );
  cx = starsNumEnd + statGap;

  drawForkIcon(context, cx, cy, r, color);
  cx += r * 6 + iconGap;
  const [, forksNumEnd] = renderText(
    context,
    formatNumber(data.forks, formatDigit),
    cx,
    cy,
    1.25 * SF,
  );
  cx = forksNumEnd + statGap;

  drawEyeIcon(context, cx, cy, eyeW, eyeH, color);
  cx += eyeW * 2 + iconGap;
  renderText(
    context,
    formatNumber(data.watchers || 0, formatDigit),
    cx,
    cy,
    1.25 * SF,
  );

  return y;
}

/**
 * Render the languages section.
 */
export function renderLanguages(
  context: CanvasRenderingContext2D,
  data: RepoCardData,
  x: number,
  y: number,
  SF: number,
): number {
  const config = REPO_CARD_CONFIG;

  if (!data.languages || data.languages.length === 0) {
    return y;
  }

  y += config.sectionSpacing;

  context.globalAlpha = config.labelOpacity;
  setFont(context, config.labelFontSize * SF, 400, 'italic');
  renderText(context, 'Languages', x * SF, y * SF, 2 * SF);

  y += config.valueFontSize * config.lineHeight + 4;
  context.globalAlpha = config.valueOpacity;
  setFont(context, config.valueFontSize * SF, 400, 'normal');

  let text = '';
  const maxLanguages = min(3, data.languages.length);
  for (let i = 0; i < maxLanguages; i++) {
    text += `${data.languages[i]}${i < maxLanguages - 1 ? ', ' : ''}`;
  }
  renderText(context, text, x * SF, y * SF, 1.25 * SF);

  if (data.languages.length > 3) {
    y += config.valueFontSize * config.lineHeight;
    renderText(
      context,
      `& ${data.languages.length - 3} more`,
      x * SF,
      y * SF,
      1.25 * SF,
    );
    y += config.valueFontSize * config.lineHeight;
  } else {
    y += config.valueFontSize * config.lineHeight;
  }

  return y;
}

/**
 * Render the community metrics section.
 */
export function renderCommunityMetrics(
  context: CanvasRenderingContext2D,
  data: RepoCardData,
  x: number,
  y: number,
  SF: number,
  orgNickname?: string,
): number {
  const config = REPO_CARD_CONFIG;
  const org = orgNickname ?? 'DevSeed';

  if (!data.totalContributors || data.totalContributors === 0) {
    return y;
  }

  y += config.sectionSpacing;

  context.globalAlpha = config.labelOpacity;
  setFont(context, config.labelFontSize * SF, 400, 'italic');
  renderText(context, 'Community', x * SF, y * SF, 2 * SF);

  y += config.valueFontSize * config.lineHeight + 4;
  context.globalAlpha = config.valueOpacity;
  setFont(context, config.valueFontSize * SF, 400, 'normal');

  const total = data.totalContributors;
  const orgContributors = data.orgContributors || 0;
  const external = data.externalContributors || 0;

  renderText(
    context,
    `${total} contributors (${orgContributors} ${org}, ${external} community)`,
    x * SF,
    y * SF,
    1.25 * SF,
  );

  if (data.totalCommits && data.totalCommits > 0) {
    y += config.valueFontSize * config.lineHeight;
    const orgPct = Math.round((data.orgCommits || 0) / data.totalCommits * 100);
    renderText(
      context,
      `${data.totalCommits.toLocaleString()} total commits (${orgPct}% from ${org})`,
      x * SF,
      y * SF,
      1.25 * SF,
    );
  }

  if (orgContributors === 1 && total > 0) {
    y += config.valueFontSize * config.lineHeight;
    context.globalAlpha = config.warningOpacity;
    setFont(context, config.valueFontSize * SF, 400, 'italic');
    renderText(
      context,
      `⚠ Single ${org} maintainer`,
      x * SF,
      y * SF,
      1.25 * SF,
    );
    context.globalAlpha = config.valueOpacity;
    setFont(context, config.valueFontSize * SF, 400, 'normal');
    y += config.valueFontSize * config.lineHeight;
  } else {
    y += config.valueFontSize * config.lineHeight;
  }

  return y;
}

/**
 * Render license badge if available.
 */
export function renderLicense(
  context: CanvasRenderingContext2D,
  data: RepoCardData,
  x: number,
  y: number,
  SF: number,
): number {
  const config = REPO_CARD_CONFIG;

  if (!data.license) {
    return y;
  }

  y += config.sectionSpacing;
  context.globalAlpha = config.valueOpacity;
  setFont(context, config.valueFontSize * SF, 400, 'normal');
  renderText(
    context,
    `License: ${data.license}`,
    x * SF,
    y * SF,
    1.25 * SF,
  );
  y += config.valueFontSize * config.lineHeight;

  return y;
}

/**
 * Render archived badge if repo is archived.
 */
export function renderArchivedBadge(
  context: CanvasRenderingContext2D,
  data: RepoCardData,
  x: number,
  y: number,
  SF: number,
): number {
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
