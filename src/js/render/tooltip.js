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
  getCommunityHealthLabel
} from './repoCard.js';
import { setFont, renderText } from './text.js';
import { min } from '../utils/helpers.js';

/**
 * Calculates the height required for a repository tooltip based on all content
 * @param {Object} d - Node data
 * @param {Object} interactionState - Interaction state object
 * @param {Object} central_repo - Central repository node
 * @param {number} SF - Scale factor
 * @param {Function} formatDate - Date formatting function
 * @param {Function} formatDateExact - Exact date formatting function
 * @param {Function} formatDigit - Digit formatting function
 * @returns {number} Required height in pixels
 */
function calculateRepoTooltipHeight(d, interactionState, central_repo, SF, formatDate, formatDateExact, formatDigit) {
  const config = REPO_CARD_CONFIG;
  const line_height = 1.2; // Line height for main tooltip sections
  let height = 0;

  // Header section
  height += 18; // Top padding (balanced)
  height += 12 * line_height; // "Repository" label (12px font * 1.2 line height = 14.4px)
  height += 18; // Spacing (balanced)

  // Title section (owner/name) - two lines
  height += 15 * line_height; // Owner line (15px font * 1.2 = 18px)
  height += 15 * line_height; // Name line (15px font * 1.2 = 18px)
  height += 42; // Spacing to dates (matches render: y += 42 accounts for name at y+18 plus padding)

  // Dates section
  height += 11 * line_height; // Created date (11px font * 1.2 = 13.2px)
  height += 11 * line_height; // Updated date (11px font * 1.2 = 13.2px)
  height += 20; // Spacing before stats (balanced)

  // Stats line
  height += config.headerFontSize * line_height; // Stats line (12px font * 1.2 = 14.4px)
  // Note: renderLanguages will add its own sectionSpacing (24px) before it

  // Languages section (if present)
  // renderLanguages adds sectionSpacing, then label, then value lines
  if (d.data.languages && d.data.languages.length > 0) {
    height += config.sectionSpacing; // 20px spacing (added by renderLanguages)
    height += config.labelFontSize * config.lineHeight + 4; // Label line (11px * 1.4 + 4 = 19.4px)
    height += config.valueFontSize * config.lineHeight; // Languages line (11.5px * 1.4 = 16.1px)
    if (d.data.languages.length > 3) {
      height += config.valueFontSize * config.lineHeight; // "& X more" line (11.5px * 1.4 = 16.1px)
    }
  }

  // Community metrics section (if present)
  // renderCommunityMetrics adds sectionSpacing, then label, then contributor count, then health, optionally bus factor
  if (d.data.totalContributors && d.data.totalContributors > 0) {
    height += config.sectionSpacing; // 20px spacing (added by renderCommunityMetrics)
    height += config.labelFontSize * config.lineHeight + 4; // Label line (11px * 1.4 + 4 = 19.4px)
    height += config.valueFontSize * config.lineHeight; // Contributors line (11.5px * 1.4 = 16.1px)
    height += config.valueFontSize * config.lineHeight; // Health line (11.5px * 1.4 = 16.1px)
    if (d.data.devseedContributors === 1 && d.data.totalContributors > 0) {
      height += config.valueFontSize * config.lineHeight; // Bus factor warning (11.5px * 1.4 = 16.1px)
    }
  }

  // License section (if present)
  // renderLicense adds sectionSpacing, then license text
  if (d.data.license) {
    height += config.sectionSpacing; // 20px spacing (added by renderLicense)
    height += config.valueFontSize * config.lineHeight; // License line (11.5px * 1.4 = 16.1px)
  }

  // Archived badge (if present)
  // renderArchivedBadge adds sectionSpacing, then archived text
  if (d.data.archived) {
    height += config.sectionSpacing; // 20px spacing (added by renderArchivedBadge)
    height += config.valueFontSize * config.lineHeight; // Archived line (11.5px * 1.4 = 16.1px)
  }

  // Clicked contributor section (if active)
  if (interactionState.clickActive && interactionState.clickedNode && interactionState.clickedNode.type === "contributor") {
    const link = interactionState.clickedNode.data.links_original?.find((l) => l.repo === d.id);
    if (link) {
      height += 28; // Spacing
      height += 11 * line_height; // "X commits by" line (11px font * 1.2 = 13.2px)
      height += 16; // Spacing
      height += 11.5 * line_height; // Contributor name (11.5px font * 1.2 = 13.8px)
      height += 18; // Spacing
      height += 11 * line_height; // Date range line (11px font * 1.2 = 13.2px)
    }
  }

  // Bottom padding
  height += 12;

  return Math.ceil(height);
}

/**
 * Calculates the width required for a repository tooltip based on all text content
 * @param {CanvasRenderingContext2D} context - Canvas context
 * @param {Object} d - Node data
 * @param {Object} interactionState - Interaction state object
 * @param {Object} central_repo - Central repository node
 * @param {number} SF - Scale factor
 * @param {Function} formatDate - Date formatting function
 * @param {Function} formatDateExact - Exact date formatting function
 * @param {Function} formatDigit - Digit formatting function
 * @returns {number} Required width in pixels
 */
function calculateRepoTooltipWidth(context, d, interactionState, central_repo, SF, formatDate, formatDateExact, formatDigit) {
  const config = REPO_CARD_CONFIG;
  let maxWidth = 0;

  // Measure title text
  setFont(context, 14 * SF, 700, "normal");
  let width = context.measureText(d.data.owner).width * 1.25;
  if (width > maxWidth) maxWidth = width;
  width = context.measureText(d.data.name).width * 1.25;
  if (width > maxWidth) maxWidth = width;

  // Measure date text
  setFont(context, 11 * SF, 400, "normal");
  width = context.measureText(`Created in ${formatDate(d.data.createdAt)}`).width * 1.25;
  if (width > maxWidth) maxWidth = width;
  width = context.measureText(`Last updated in ${formatDate(d.data.updatedAt)}`).width * 1.25;
  if (width > maxWidth) maxWidth = width;

  // Measure stats line
  setFont(context, config.headerFontSize * SF, 400, 'normal');
  const stars = d.data.stars < 10 ? String(d.data.stars) : formatDigit(d.data.stars);
  const forks = d.data.forks < 10 ? String(d.data.forks) : formatDigit(d.data.forks);
  const watchers = (d.data.watchers || 0) < 10 ? String(d.data.watchers || 0) : formatDigit(d.data.watchers || 0);
  width = context.measureText(`${stars} stars | ${forks} forks | ${watchers} watchers`).width * 1.25;
  if (width > maxWidth) maxWidth = width;

  // Measure languages text
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

  // Measure community metrics text
  if (d.data.totalContributors && d.data.totalContributors > 0) {
    setFont(context, config.valueFontSize * SF, 400, 'normal');
    const total = d.data.totalContributors;
    const devseed = d.data.devseedContributors || 0;
    const external = d.data.externalContributors || 0;
    width = context.measureText(`${total} contributors (${devseed} DevSeed, ${external} community)`).width * 1.25;
    if (width > maxWidth) maxWidth = width;

    const ratio = d.data.communityRatio || 0;
    const healthPercent = Math.round(ratio * 100);
    const healthLabel = getCommunityHealthLabel(ratio);
    width = context.measureText(`Community Health: ${healthPercent}% (${healthLabel})`).width * 1.25;
    if (width > maxWidth) maxWidth = width;

    if (devseed === 1 && total > 0) {
      width = context.measureText('⚠ Single DevSeed maintainer').width * 1.25;
      if (width > maxWidth) maxWidth = width;
    }
  }

  // Measure license text
  if (d.data.license) {
    setFont(context, config.valueFontSize * SF, 400, 'normal');
    width = context.measureText(`License: ${d.data.license}`).width * 1.25;
    if (width > maxWidth) maxWidth = width;
  }

  // Measure archived badge text
  if (d.data.archived) {
    setFont(context, config.valueFontSize * SF, 400, 'italic');
    width = context.measureText('📦 Archived').width * 1.25;
    if (width > maxWidth) maxWidth = width;
  }

  // Measure clicked contributor section (if active)
  if (interactionState.clickActive && interactionState.clickedNode && interactionState.clickedNode.type === "contributor") {
    const link = interactionState.clickedNode.data.links_original?.find((l) => l.repo === d.id);
    if (link) {
      setFont(context, 11 * SF, 400, "italic");
      const commitText = link.commit_count === 1 ? '1 commit by' : `${link.commit_count} commits by`;
      width = context.measureText(commitText).width * 1.25;
      if (width > maxWidth) maxWidth = width;

      setFont(context, 11.5 * SF, 700, "normal");
      width = context.measureText(interactionState.clickedNode.data.contributor_name).width * 1.25;
      if (width > maxWidth) maxWidth = width;

      setFont(context, 11 * SF, 400, "normal");
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

  // Add padding (40px on each side = 80px total)
  maxWidth = maxWidth / SF + 80;

  // Ensure minimum width
  return Math.max(maxWidth, 280);
}

/**
 * Draws a tooltip above a node with detailed information
 * @param {CanvasRenderingContext2D} context - Canvas rendering context
 * @param {Object} d - Node data
 * @param {Object} config - Configuration object:
 *   - SF: Scale factor
 *   - REPO_CENTRAL: ID of central repository
 *   - COLOR_BACKGROUND: Background color
 *   - COLOR_TEXT: Text color
 *   - COLOR_CONTRIBUTOR: Contributor color
 *   - COLOR_REPO: Repository color
 *   - COLOR_OWNER: Owner color
 *   - min: Min function (Math.min)
 * @param {Object} interactionState - Interaction state object
 * @param {Object} central_repo - Central repository node
 * @param {Function} formatDate - Date formatting function
 * @param {Function} formatDateExact - Exact date formatting function
 * @param {Function} formatDigit - Digit formatting function
 */
export function drawTooltip(context, d, config, interactionState, central_repo, formatDate, formatDateExact, formatDigit) {
  const { SF, REPO_CENTRAL, COLOR_BACKGROUND, COLOR_TEXT, COLOR_CONTRIBUTOR, COLOR_REPO, COLOR_OWNER, min } = config;
  
  let line_height = 1.2;
  let font_size;
  let text;

  // Figure out the base x and y position of the tooltip
  const x_base = d.x;
  const y_base =
    d.y + (d.y < 0 ? 1 : -1) * (d.max_radius ? d.max_radius : d.r);

  /////////////////////////////////////////////////////////////
  // Calculate required dimensions dynamically
  let H, W;

  if (d.type === "contributor") {
    // Contributor tooltip
    H = 80;
    W = 280;
  } else if (d.type === "owner") {
    // Owner tooltip - keep existing logic for now
    H = 93;
    W = 280;
  } else if (d.type === "repo") {
    // Repository tooltip - use dynamic calculations
    if (d.id === central_repo.id) {
      H = 80;
      W = 280;
    } else {
      // Calculate height dynamically based on all content
      H = calculateRepoTooltipHeight(d, interactionState, central_repo, SF, formatDate, formatDateExact, formatDigit);
      // Calculate width dynamically based on all text content
      W = calculateRepoTooltipWidth(context, d, interactionState, central_repo, SF, formatDate, formatDateExact, formatDigit);
    }
  } else {
    H = 93;
    W = 280;
  }

  // Write all the repos for the "owner" nodes, but make sure they are not wider than the box and save each line to write out
  if (d.type === "owner") {
    font_size = 11.5;
    setFont(context, font_size * SF, 400, "normal");
    d.text_lines = [];
    text = "";
    d.connected_node_cloud.forEach((repo, i) => {
      // Check the length of the new text to add
      let new_repo = `${repo.data.name}${i < d.connected_node_cloud.length - 1 ? ", " : ""
        }`;
      // If it's longer, push the current text to the array and start a new one
      if (
        context.measureText(`${text}${new_repo}`).width * 1.25 >
        0.85 * W * SF
      ) {
        d.text_lines.push(text);
        text = new_repo;
      } else {
        text += new_repo;
      } // else
    }); // forEach
    // Add the final possible bit
    if (text !== "") d.text_lines.push(text);
    // Update the height of the tooltip
    H += d.text_lines.length * (font_size * line_height);
    
    // Recalculate width for owner tooltips based on text lines
    let tW = 0;
    setFont(context, 15 * SF, 700, "normal");
    tW = context.measureText(d.data.owner).width * 1.25;
    // Check if any of the "repo lines" are longer than the owner's name
    setFont(context, 11.5 * SF, 400, "normal");
    d.text_lines.forEach((t) => {
      let line_width = context.measureText(t).width * 1.25;
      if (line_width > tW) tW = line_width;
    }); // forEach
    // Update the max width if the text is wider
    if (tW + 40 * SF > W * SF) W = tW / SF + 40;
  } else if (d.type === "contributor") {
    // Recalculate width for contributor tooltips
    setFont(context, 15 * SF, 700, "normal");
    text = d.data ? d.data.contributor_name : d.author_name;
    let tW = context.measureText(text).width * 1.25;
    // Update the max width if the text is wider
    if (tW + 40 * SF > W * SF) W = tW / SF + 40;
  }
  // For repo tooltips, width and height are already calculated dynamically above

  /////////////////////////////////////////////////////////////////
  // If the hovered node is above half of the page, place the tooltip below the node
  // Note: d.x and d.y are in the centered coordinate system (relative to center at 0,0)
  // The context has already been translated to (WIDTH/2, HEIGHT/2) in drawHoverState
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
  // Debug: Ensure we're using a visible color
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

  // Line along the side
  context.fillStyle = COL;
  context.fillRect((x - W / 2 - 1) * SF, (y - 1) * SF, (W + 2) * SF, 6 * SF);

  // Textual settings
  context.textAlign = "center";
  context.textBaseline = "middle";

  // Contributor, owner or repo
  y = 18; // Balanced
  font_size = 12;
  setFont(context, font_size * SF, 400, "italic");
  context.fillStyle = COL;
  text = "";
  if (d.id === central_repo.id) text = REPO_CENTRAL;
  else if (d.type === "contributor") text = "Contributor";
  else if (d.type === "repo") text = "Repository";
  else if (d.type === "owner") text = "Owner";
  renderText(context, text, x * SF, y * SF, 2.5 * SF);

  context.fillStyle = COLOR_TEXT;
  y += 18; // Balanced

  if (d.id === central_repo.id) {
    font_size = 15;
    setFont(context, font_size * SF, 700, "normal");
    renderText(context, REPO_CENTRAL, x * SF, y * SF, 1.25 * SF);
  } else if (d.type === "contributor") {
    // The contributor's name
    font_size = 16;
    setFont(context, font_size * SF, 700, "normal");
    text = d.data ? d.data.contributor_name : d.author_name;
    renderText(context, text, x * SF, y * SF, 1.25 * SF);
  } else if (d.type === "owner") {
    // The name
    font_size = 16;
    setFont(context, font_size * SF, 700, "normal");
    renderText(context, d.data.owner, x * SF, y * SF, 1.25 * SF);

    // Which repos fall under this owner in this visual
    y += 28;
    font_size = 11;
    context.globalAlpha = 0.6;
    setFont(context, font_size * SF, 400, "italic");
    renderText(context, "Included repositories", x * SF, y * SF, 2 * SF);

    // Write out all the repositories
    font_size = 11.5;
    y += font_size * line_height + 4;
    context.globalAlpha = 0.9;
    setFont(context, font_size * SF, 400, "normal");
    d.text_lines.forEach((l, i) => {
      renderText(context, l, x * SF, y * SF, 1.25 * SF);
      y += font_size * line_height;
    }); // forEach
  } else if (d.type === "repo") {
    // The repo's name and owner
    font_size = 15;
    setFont(context, font_size * SF, 700, "normal");
    renderText(context, `${d.data.owner}/`, x * SF, y * SF, 1.25 * SF);
    renderText(
      context,
      d.data.name,
      x * SF,
      (y + line_height * font_size) * SF,
      1.25 * SF,
    );

    // The creation date
    // Note: name was rendered at y + 18, so we need to move past it (18) plus add spacing (24) = 42
    y += 42;
    font_size = 11;
    context.globalAlpha = 0.7;
    setFont(context, font_size * SF, 400, "normal");
    renderText(
      context,
      `Created in ${formatDate(d.data.createdAt)}`,
      x * SF,
      y * SF,
      1.25 * SF,
    );
    // The most recent updated date
    y += font_size * line_height;
    renderText(
      context,
      `Last updated in ${formatDate(d.data.updatedAt)}`,
      x * SF,
      y * SF,
      1.25 * SF,
    );

    // ============================================================
    // Repo Card Sections (using modular components)
    // ============================================================

    // Stats line: stars, forks, watchers
    y += 20; // Balanced
    renderStatsLine(context, d.data, x, y, SF, formatDigit);

    // Languages section
    y = renderLanguages(context, d.data, x, y, SF);

    // Community metrics section
    y = renderCommunityMetrics(context, d.data, x, y, SF);

    // License (if available)
    y = renderLicense(context, d.data, x, y, SF);

    // Archived badge (if applicable)
    y = renderArchivedBadge(context, d.data, x, y, SF);

    // Reset context for potential click section
    context.fillStyle = COLOR_TEXT;
    context.globalAlpha = 0.9;

    // First and last commit the the hovered repo if a click is active
    if (interactionState.clickActive && interactionState.clickedNode && interactionState.clickedNode.type === "contributor") {
      // Get the first and last commit of the contributor to this repo
      let link = interactionState.clickedNode.data.links_original.find(
        (l) => l.repo === d.id,
      );
      // Skip if link doesn't exist (contributor not connected to this repo)
      if (!link) return;
      let num_commits = link.commit_count;

      y += 20; // Reduced from 28
      font_size = 11;
      context.globalAlpha = 0.6;
      setFont(context, font_size * SF, 400, "italic");
      text = num_commits === 1 ? "1 commit by" : `${num_commits} commits by`;
      renderText(context, text, x * SF, y * SF, 2 * SF);

      y += 12; // Reduced from 16
      font_size = 11.5;
      context.globalAlpha = 0.9;
      setFont(context, font_size * SF, 700, "normal");
      renderText(
        context,
        interactionState.clickedNode.data.contributor_name,
        x * SF,
        y * SF,
        1.25 * SF,
      );

      y += 14; // Reduced from 18
      font_size = 11;
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
      renderText(context, text, x * SF, y * SF, 1.25 * SF);
    } // if
  } // else

  context.restore();
}
