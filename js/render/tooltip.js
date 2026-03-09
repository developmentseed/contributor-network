/**
 * Tooltip rendering for hovered/clicked nodes
 * @module render/tooltip
 */

import {
  renderStatsLine,
  renderLanguages,
  renderCommunityMetrics,
  renderLicense,
  renderArchivedBadge,
  REPO_CARD_CONFIG,
} from './repoCard.js';
import { setFont, renderText } from './text.js';
import { min } from '../utils/helpers.js';

const TOOLTIP_PADDING = 18;
const OWNER_MAX_REPOS = 12;

/**
 * Draws a subtle horizontal divider between tooltip sections
 */
function drawSectionDivider(context, y, W, x, SF) {
  context.save();
  context.globalAlpha = 0.22;
  context.strokeStyle = '#443F3F';
  context.lineWidth = Math.round(SF);
  context.beginPath();
  context.moveTo((x - W / 2 + TOOLTIP_PADDING) * SF, Math.round(y * SF) + 0.5);
  context.lineTo((x + W / 2 - TOOLTIP_PADDING) * SF, Math.round(y * SF) + 0.5);
  context.stroke();
  context.restore();
}

/**
 * Calculates the height required for a repository tooltip.
 * Mirrors the exact y-advances in drawTooltip's render code.
 * @param {Object} d - Node data
 * @param {Object} interactionState - Interaction state object
 * @param {number} SF - Scale factor
 * @param {Function} formatDate - Date formatting function
 * @param {Function} formatDateExact - Exact date formatting function
 * @param {Function} formatDigit - Digit formatting function
 * @returns {number} Required height in pixels
 */
function calculateRepoTooltipHeight(d, interactionState) {
  const config = REPO_CARD_CONFIG;
  let y = 0;

  // Header: type label at y=26, then y += 30
  y += 26;
  y += 30;

  // Owner/name: owner at y, name at y+26.4, then y += 58 from owner position
  y += 58;

  // Dates: created at y, y += 26, updated at y, y += 36
  y += 26;
  y += 36;

  // Stats: renderStatsLine doesn't advance y

  // Languages section
  if (d.data.languages && d.data.languages.length > 0) {
    y += config.sectionSpacing;
    y += config.valueFontSize * config.lineHeight + 4;
    y += config.valueFontSize * config.lineHeight;
    if (d.data.languages.length > 3) {
      y += config.valueFontSize * config.lineHeight;
    }
  }

  // Community metrics section (health line removed)
  if (d.data.totalContributors && d.data.totalContributors > 0) {
    y += config.sectionSpacing;
    y += config.valueFontSize * config.lineHeight + 4;
    if (d.data.devseedContributors === 1 && d.data.totalContributors > 0) {
      y += config.valueFontSize * config.lineHeight;
      y += config.valueFontSize * config.lineHeight;
    } else {
      y += config.valueFontSize * config.lineHeight;
    }
  }

  // License section
  if (d.data.license) {
    y += config.sectionSpacing;
    y += config.valueFontSize * config.lineHeight;
  }

  // Archived badge
  if (d.data.archived) {
    y += config.sectionSpacing;
    y += config.valueFontSize * config.lineHeight;
  }

  // Clicked contributor section
  if (interactionState.clickActive && interactionState.clickedNode && interactionState.clickedNode.type === "contributor") {
    const link = interactionState.clickedNode.data.links_original?.find((l) => l.repo === d.id);
    if (link) {
      y += 24;
      y += 15;
      y += 17;
    }
  }

  y += 16;

  return Math.ceil(y);
}

/**
 * Calculates the width required for a repository tooltip based on all text content
 * @param {CanvasRenderingContext2D} context - Canvas context
 * @param {Object} d - Node data
 * @param {Object} interactionState - Interaction state object
 * @param {number} SF - Scale factor
 * @param {Function} formatDate - Date formatting function
 * @param {Function} formatDateExact - Exact date formatting function
 * @param {Function} formatDigit - Digit formatting function
 * @returns {number} Required width in pixels
 */
function calculateRepoTooltipWidth(context, d, interactionState, SF, formatDate, formatDateExact, formatDigit) {
  const config = REPO_CARD_CONFIG;
  let maxWidth = 0;

  setFont(context, 22 * SF, 700, "normal");
  let width = context.measureText(d.data.owner).width * 1.25;
  if (width > maxWidth) maxWidth = width;
  width = context.measureText(d.data.name).width * 1.25;
  if (width > maxWidth) maxWidth = width;

  setFont(context, 16 * SF, 400, "normal");
  width = context.measureText(`Created in ${formatDate(d.data.createdAt)}`).width * 1.25;
  if (width > maxWidth) maxWidth = width;
  width = context.measureText(`Last updated in ${formatDate(d.data.updatedAt)}`).width * 1.25;
  if (width > maxWidth) maxWidth = width;

  setFont(context, config.headerFontSize * SF, 400, 'normal');
  const stars = d.data.stars < 10 ? String(d.data.stars) : formatDigit(d.data.stars);
  const forks = d.data.forks < 10 ? String(d.data.forks) : formatDigit(d.data.forks);
  const watchers = (d.data.watchers || 0) < 10 ? String(d.data.watchers || 0) : formatDigit(d.data.watchers || 0);
  // Estimate: number text widths + drawn icon widths + gaps (28px between groups)
  const statsNumWidth = context.measureText(`★  ${stars}      ${forks}      ${watchers}`).width * 1.25;
  const statsIconWidth = config.headerFontSize * SF * (0.18 * 6 + 0.55 * 2);
  width = statsNumWidth + statsIconWidth;
  if (width > maxWidth) maxWidth = width;

  if (d.data.languages && d.data.languages.length > 0) {
    setFont(context, config.valueFontSize * SF, 400, 'normal');
    let langText = '';
    const maxLangs = min(3, d.data.languages.length);
    for (let i = 0; i < maxLangs; i++) {
      langText += `${d.data.languages[i]}${i < maxLangs - 1 ? ', ' : ''}`;
    }
    width = context.measureText(langText).width * 1.25;
    if (width > maxWidth) maxWidth = width;
    if (d.data.languages.length > 3) {
      width = context.measureText(`& ${d.data.languages.length - 3} more`).width * 1.25;
      if (width > maxWidth) maxWidth = width;
    }
  }

  if (d.data.totalContributors && d.data.totalContributors > 0) {
    setFont(context, config.valueFontSize * SF, 400, 'normal');
    const total = d.data.totalContributors;
    const devseed = d.data.devseedContributors || 0;
    const external = d.data.externalContributors || 0;
    width = context.measureText(`${total} contributors (${devseed} DevSeed, ${external} community)`).width * 1.25;
    if (width > maxWidth) maxWidth = width;

    if (devseed === 1 && total > 0) {
      width = context.measureText('⚠ Single DevSeed maintainer').width * 1.25;
      if (width > maxWidth) maxWidth = width;
    }
  }

  if (d.data.license) {
    setFont(context, config.valueFontSize * SF, 400, 'normal');
    width = context.measureText(`License: ${d.data.license}`).width * 1.25;
    if (width > maxWidth) maxWidth = width;
  }

  if (d.data.archived) {
    setFont(context, config.valueFontSize * SF, 400, 'italic');
    width = context.measureText('📦 Archived').width * 1.25;
    if (width > maxWidth) maxWidth = width;
  }

  if (interactionState.clickActive && interactionState.clickedNode && interactionState.clickedNode.type === "contributor") {
    const link = interactionState.clickedNode.data.links_original?.find((l) => l.repo === d.id);
    if (link) {
      setFont(context, 14 * SF, 400, "italic");
      const commitText = link.commit_count === 1 ? '1 commit by' : `${link.commit_count} commits by`;
      width = context.measureText(commitText).width * 1.25;
      if (width > maxWidth) maxWidth = width;

      setFont(context, 14 * SF, 700, "normal");
      width = context.measureText(interactionState.clickedNode.data.contributor_name).width * 1.25;
      if (width > maxWidth) maxWidth = width;

      setFont(context, 14 * SF, 400, "normal");
      let dateText = '';
      if (formatDateExact(link.commit_sec_min) === formatDateExact(link.commit_sec_max)) {
        dateText = `On ${formatDateExact(link.commit_sec_max)}`;
      } else if (formatDate(link.commit_sec_min) === formatDate(link.commit_sec_max)) {
        dateText = `In ${formatDate(link.commit_sec_max)}`;
      } else {
        dateText = `Between ${formatDate(link.commit_sec_min)} / ${formatDate(link.commit_sec_max)}`;
      }
      width = context.measureText(dateText).width * 1.25;
      if (width > maxWidth) maxWidth = width;
    }
  }

  maxWidth = maxWidth / SF + 80;

  return Math.max(maxWidth, 280);
}

/**
 * Draws a tooltip above a node with detailed information
 * @param {CanvasRenderingContext2D} context - Canvas rendering context
 * @param {Object} d - Node data
 * @param {Object} config - Configuration object:
 *   - SF: Scale factor
 *   - COLOR_BACKGROUND: Background color
 *   - COLOR_TEXT: Text color
 *   - COLOR_CONTRIBUTOR: Contributor color
 *   - COLOR_REPO: Repository color
 *   - COLOR_OWNER: Owner color
 *   - min: Min function (Math.min)
 * @param {Object} interactionState - Interaction state object
 * @param {Object} central_repo - Deprecated, no longer used
 * @param {Function} formatDate - Date formatting function
 * @param {Function} formatDateExact - Exact date formatting function
 * @param {Function} formatDigit - Digit formatting function
 */
export function drawTooltip(context, d, config, interactionState, _central_repo, formatDate, formatDateExact, formatDigit) {
  const { SF, COLOR_BACKGROUND, COLOR_TEXT, COLOR_CONTRIBUTOR, COLOR_REPO, COLOR_OWNER } = config;

  let line_height = 1.2;
  let font_size;
  let text;

  const x_base = d.x;
  const y_base =
    d.y + (d.y < 0 ? 1 : -1) * (d.max_radius ? d.max_radius : d.r);

  let H, W;

  if (d.type === "contributor") {
    H = 100;
    W = 320;
  } else if (d.type === "owner") {
    H = 155;
    W = 320;
  } else if (d.type === "repo") {
    H = calculateRepoTooltipHeight(d, interactionState);
    W = calculateRepoTooltipWidth(context, d, interactionState, SF, formatDate, formatDateExact, formatDigit);
  } else {
    H = 116;
    W = 320;
  }

  if (d.type === "owner") {
    const sortedRepos = [...d.connected_node_cloud].sort((a, b) => (b.data.forks || 0) - (a.data.forks || 0));
    const visibleRepos = sortedRepos.slice(0, OWNER_MAX_REPOS);

    font_size = 15;
    setFont(context, font_size * SF, 400, "normal");
    d.text_lines = [];
    text = "";
    visibleRepos.forEach((repo, i) => {
      let new_repo = `${repo.data.name}${i < visibleRepos.length - 1 ? ' · ' : ''}`;
      if (context.measureText(`${text}${new_repo}`).width * 1.25 > 0.85 * W * SF) {
        d.text_lines.push(text.replace(/ · $/, ''));
        text = new_repo;
      } else {
        text += new_repo;
      }
    });
    if (text !== "") d.text_lines.push(text.replace(/ · $/, ''));

    const hiddenRepoCount = d.connected_node_cloud.length - OWNER_MAX_REPOS;
    let lineCount = d.text_lines.length;
    if (hiddenRepoCount > 0) lineCount += 1;
    H += lineCount * (font_size * 1.4);

    let tW = 0;
    setFont(context, 22 * SF, 700, "normal");
    tW = context.measureText(d.data.owner).width * 1.25;
    setFont(context, 15 * SF, 400, "normal");
    d.text_lines.forEach((t) => {
      let line_width = context.measureText(t).width * 1.25;
      if (line_width > tW) tW = line_width;
    });
    if (tW + 40 * SF > W * SF) W = tW / SF + 40;
  } else if (d.type === "contributor") {
    setFont(context, 20 * SF, 700, "normal");
    text = d.data ? d.data.contributor_name : d.author_name;
    let tW = context.measureText(text).width * 1.25;
    if (tW + 40 * SF > W * SF) W = tW / SF + 40;
  }

  let H_OFFSET = d.y < 0 ? 20 : -H - 20;
  context.save();
  context.translate(x_base * SF, (y_base + H_OFFSET) * SF);

  let x = 0;
  let y = 0;
  let COL;
  if (d.type === "contributor") COL = COLOR_CONTRIBUTOR;
  else if (d.type === "repo") COL = COLOR_REPO;
  else if (d.type === "owner") COL = COLOR_OWNER;

  // Background rectangle
  const bgColor = COLOR_BACKGROUND || "#f7f7f7";
  const rectX = (x - W / 2) * SF;
  const rectY = y * SF;
  const rectW = W * SF;
  const rectH = H * SF;
  context.shadowBlur = 3 * SF;
  context.shadowColor = "#d4d4d4";
  context.fillStyle = bgColor;
  context.fillRect(rectX, rectY, rectW, rectH);
  context.shadowBlur = 0;

  // Left accent bar (vertical, 4px wide, full height)
  context.fillStyle = COL;
  context.fillRect((x - W / 2) * SF, y * SF, 4 * SF, H * SF);

  context.textAlign = "left";
  context.textBaseline = "middle";

  // x position for left-aligned text (padding from left edge, clears the accent bar)
  const xLeft = x - W / 2 + TOOLTIP_PADDING;

  // Node type label
  y = 26;
  font_size = 15;
  setFont(context, font_size * SF, 400, "italic");
  context.fillStyle = COL;
  text = "";
  if (d.type === "contributor") text = "Contributor";
  else if (d.type === "repo") text = "Repository";
  else if (d.type === "owner") text = "Owner";
  renderText(context, text, xLeft * SF, y * SF, 2.5 * SF);

  context.fillStyle = COLOR_TEXT;
  y += 30;

  if (d.type === "contributor") {
    font_size = 20;
    setFont(context, font_size * SF, 700, "normal");
    text = d.data ? d.data.contributor_name : d.author_name;
    renderText(context, text, xLeft * SF, y * SF, 1.25 * SF);
  } else if (d.type === "owner") {
    // Org name
    font_size = 22;
    setFont(context, font_size * SF, 700, "normal");
    renderText(context, d.data.owner, xLeft * SF, y * SF, 1.25 * SF);

    // Repo count subtitle
    y += 28;
    font_size = 14;
    context.globalAlpha = 0.6;
    setFont(context, font_size * SF, 400, "normal");
    const repoCount = d.connected_node_cloud.length;
    renderText(context, `${repoCount} ${repoCount === 1 ? 'repository' : 'repositories'}`, xLeft * SF, y * SF, 1.25 * SF);

    // Divider
    drawSectionDivider(context, y + 14, W, x, SF);

    // "Repositories" section label
    y += 30;
    font_size = 14;
    context.globalAlpha = 0.6;
    setFont(context, font_size * SF, 400, "italic");
    renderText(context, "Repositories", xLeft * SF, y * SF, 2 * SF);

    // Repo list
    font_size = 15;
    y += font_size * 1.4 + 4;
    context.globalAlpha = 0.9;
    setFont(context, font_size * SF, 400, "normal");
    d.text_lines.forEach((l) => {
      renderText(context, l, xLeft * SF, y * SF, 1.25 * SF);
      y += font_size * 1.4;
    });

    // "& X more" truncation line
    const hiddenCount = d.connected_node_cloud.length - OWNER_MAX_REPOS;
    if (hiddenCount > 0) {
      context.globalAlpha = 0.5;
      setFont(context, font_size * SF, 400, "italic");
      renderText(context, `& ${hiddenCount} more`, xLeft * SF, y * SF, 1.25 * SF);
      context.globalAlpha = 0.9;
    }
  } else if (d.type === "repo") {
    // Owner/name title
    font_size = 22;
    setFont(context, font_size * SF, 700, "normal");
    renderText(context, `${d.data.owner}/`, xLeft * SF, y * SF, 1.25 * SF);
    renderText(
      context,
      d.data.name,
      xLeft * SF,
      (y + line_height * font_size) * SF,
      1.25 * SF,
    );

    // Dates
    y += 58;
    font_size = 16;
    context.globalAlpha = 0.7;
    setFont(context, font_size * SF, 400, "normal");
    renderText(context, `Created in ${formatDate(d.data.createdAt)}`, xLeft * SF, y * SF, 1.25 * SF);
    y += 26;
    renderText(context, `Last updated in ${formatDate(d.data.updatedAt)}`, xLeft * SF, y * SF, 1.25 * SF);

    // Divider separating dates from stats
    drawSectionDivider(context, y + 18, W, x, SF);

    // Stats
    y += 36;
    renderStatsLine(context, d.data, xLeft, y, SF, formatDigit);

    // Divider separating stats block from detail sections
    const statsY = y;
    drawSectionDivider(context, y + 17, W, x, SF);
    y = renderLanguages(context, d.data, xLeft, y, SF);

    // Community metrics — only draw divider if a previous section rendered
    if (d.data.totalContributors && d.data.totalContributors > 0) {
      if (y > statsY) drawSectionDivider(context, y + 4, W, x, SF);
    }
    y = renderCommunityMetrics(context, d.data, xLeft, y, SF);

    // License — only draw divider if a previous section rendered
    if (d.data.license) {
      if (y > statsY) drawSectionDivider(context, y + 4, W, x, SF);
    }
    y = renderLicense(context, d.data, xLeft, y, SF);

    // Archived badge — only draw divider if a previous section rendered
    if (d.data.archived) {
      if (y > statsY) drawSectionDivider(context, y + 4, W, x, SF);
    }
    y = renderArchivedBadge(context, d.data, xLeft, y, SF);

    context.fillStyle = COLOR_TEXT;
    context.globalAlpha = 0.9;

    // Clicked contributor section
    if (interactionState.clickActive && interactionState.clickedNode && interactionState.clickedNode.type === "contributor") {
      let link = interactionState.clickedNode.data.links_original.find(
        (l) => l.repo === d.id,
      );
      if (!link) return;
      let num_commits = link.commit_count;

      y += 24;
      font_size = 14;
      context.globalAlpha = 0.6;
      setFont(context, font_size * SF, 400, "italic");
      text = num_commits === 1 ? "1 commit by" : `${num_commits} commits by`;
      renderText(context, text, xLeft * SF, y * SF, 2 * SF);

      y += 15;
      font_size = 14;
      context.globalAlpha = 0.9;
      setFont(context, font_size * SF, 700, "normal");
      renderText(
        context,
        interactionState.clickedNode.data.contributor_name,
        xLeft * SF,
        y * SF,
        1.25 * SF,
      );

      y += 17;
      font_size = 14;
      context.globalAlpha = 0.6;
      setFont(context, font_size * SF, 400, "normal");
      if (
        formatDateExact(link.commit_sec_min) ===
        formatDateExact(link.commit_sec_max)
      )
        text = `On ${formatDateExact(link.commit_sec_max)}`;
      else if (
        formatDate(link.commit_sec_min) === formatDate(link.commit_sec_max)
      )
        text = `In ${formatDate(link.commit_sec_max)}`;
      else
        text = `Between ${formatDate(link.commit_sec_min)} / ${formatDate(
          link.commit_sec_max,
        )}`;
      renderText(context, text, xLeft * SF, y * SF, 1.25 * SF);
    }
  }

  context.restore();
}
