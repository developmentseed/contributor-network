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
  type RepoCardData,
} from './repoCard';
import { setFont, renderText } from './text';
import { min } from '../utils/helpers';
import type { VisualizationNode, InteractionState, LinkData } from '../types';

const TOOLTIP_PADDING = 18;
const OWNER_MAX_REPOS = 12;

interface TooltipConfig {
  SF: number;
  COLOR_BACKGROUND: string;
  COLOR_TEXT: string;
  COLOR_CONTRIBUTOR: string;
  COLOR_REPO: string;
  COLOR_OWNER: string;
  min: (...values: number[]) => number;
  orgNickname?: string;
}

/**
 * Draws a subtle horizontal divider between tooltip sections.
 */
function drawSectionDivider(
  context: CanvasRenderingContext2D,
  y: number,
  W: number,
  x: number,
  SF: number,
): void {
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
 */
function calculateRepoTooltipHeight(
  d: VisualizationNode,
  interactionState: InteractionState,
): number {
  const config = REPO_CARD_CONFIG;
  let y = 0;

  y += 26;
  y += 30;
  y += 58;
  y += 26;
  y += 36;

  const data = d.data as Record<string, any>;

  if (data.languages && data.languages.length > 0) {
    y += config.sectionSpacing;
    y += config.valueFontSize * config.lineHeight + 4;
    y += config.valueFontSize * config.lineHeight;
    if (data.languages.length > 3) {
      y += config.valueFontSize * config.lineHeight;
    }
  }

  if (data.totalContributors && data.totalContributors > 0) {
    y += config.sectionSpacing;
    y += config.valueFontSize * config.lineHeight + 4;
    if (data.totalCommits && data.totalCommits > 0) {
      y += config.valueFontSize * config.lineHeight;
    }
    if (data.orgContributors === 1 && data.totalContributors > 0) {
      y += config.valueFontSize * config.lineHeight;
      y += config.valueFontSize * config.lineHeight;
    } else {
      y += config.valueFontSize * config.lineHeight;
    }
  }

  if (data.license) {
    y += config.sectionSpacing;
    y += config.valueFontSize * config.lineHeight;
  }

  if (data.archived) {
    y += config.sectionSpacing;
    y += config.valueFontSize * config.lineHeight;
  }

  if (
    interactionState.clickActive &&
    interactionState.clickedNode &&
    interactionState.clickedNode.type === 'contributor'
  ) {
    const clickedData = interactionState.clickedNode.data as Record<string, any>;
    const link = clickedData.links_original?.find(
      (l: LinkData) => l.repo === d.id,
    );
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
 * Calculates the width required for a repository tooltip based on all text content.
 */
function calculateRepoTooltipWidth(
  context: CanvasRenderingContext2D,
  d: VisualizationNode,
  interactionState: InteractionState,
  SF: number,
  formatDate: (value: Date) => string,
  formatDateExact: (value: Date) => string,
  formatDigit: (value: number) => string,
  orgNickname?: string,
): number {
  const org = orgNickname ?? '';
  const config = REPO_CARD_CONFIG;
  let maxWidth = 0;

  const data = d.data as Record<string, any>;

  setFont(context, 22 * SF, 700, 'normal');
  let width = context.measureText(data.owner).width * 1.25;
  if (width > maxWidth) maxWidth = width;
  width = context.measureText(data.name).width * 1.25;
  if (width > maxWidth) maxWidth = width;

  setFont(context, 16 * SF, 400, 'normal');
  width =
    context.measureText(`Created in ${formatDate(data.createdAt)}`).width *
    1.25;
  if (width > maxWidth) maxWidth = width;
  width =
    context.measureText(`Last updated in ${formatDate(data.updatedAt)}`).width *
    1.25;
  if (width > maxWidth) maxWidth = width;

  setFont(context, config.headerFontSize * SF, 400, 'normal');
  const stars =
    data.stars < 10 ? String(data.stars) : formatDigit(data.stars);
  const forks =
    data.forks < 10 ? String(data.forks) : formatDigit(data.forks);
  const watchers =
    (data.watchers || 0) < 10
      ? String(data.watchers || 0)
      : formatDigit(data.watchers || 0);
  const statsNumWidth =
    context.measureText(
      `★  ${stars}      ${forks}      ${watchers}`,
    ).width * 1.25;
  const statsIconWidth =
    config.headerFontSize * SF * (0.18 * 6 + 0.55 * 2);
  width = statsNumWidth + statsIconWidth;
  if (width > maxWidth) maxWidth = width;

  if (data.languages && data.languages.length > 0) {
    setFont(context, config.valueFontSize * SF, 400, 'normal');
    let langText = '';
    const maxLangs = min(3, data.languages.length);
    for (let i = 0; i < maxLangs; i++) {
      langText += `${data.languages[i]}${i < maxLangs - 1 ? ', ' : ''}`;
    }
    width = context.measureText(langText).width * 1.25;
    if (width > maxWidth) maxWidth = width;
    if (data.languages.length > 3) {
      width =
        context.measureText(`& ${data.languages.length - 3} more`).width *
        1.25;
      if (width > maxWidth) maxWidth = width;
    }
  }

  if (data.totalContributors && data.totalContributors > 0) {
    setFont(context, config.valueFontSize * SF, 400, 'normal');
    const total = data.totalContributors;
    const orgContributors = data.orgContributors || 0;
    const external = data.externalContributors || 0;
    width =
      context.measureText(
        `${total} contributors (${orgContributors} ${org}, ${external} community)`,
      ).width * 1.25;
    if (width > maxWidth) maxWidth = width;

    if (data.totalCommits && data.totalCommits > 0) {
      const orgPct = Math.round((data.orgCommits || 0) / data.totalCommits * 100);
      width =
        context.measureText(
          `${data.totalCommits.toLocaleString()} total commits (${orgPct}% from ${org})`,
        ).width * 1.25;
      if (width > maxWidth) maxWidth = width;
    }

    if (orgContributors === 1 && total > 0) {
      width =
        context.measureText(`⚠ Single ${org} maintainer`).width * 1.25;
      if (width > maxWidth) maxWidth = width;
    }
  }

  if (data.license) {
    setFont(context, config.valueFontSize * SF, 400, 'normal');
    width =
      context.measureText(`License: ${data.license}`).width * 1.25;
    if (width > maxWidth) maxWidth = width;
  }

  if (data.archived) {
    setFont(context, config.valueFontSize * SF, 400, 'italic');
    width = context.measureText('📦 Archived').width * 1.25;
    if (width > maxWidth) maxWidth = width;
  }

  if (
    interactionState.clickActive &&
    interactionState.clickedNode &&
    interactionState.clickedNode.type === 'contributor'
  ) {
    const clickedData = interactionState.clickedNode.data as Record<string, any>;
    const link = clickedData.links_original?.find(
      (l: LinkData) => l.repo === d.id,
    );
    if (link) {
      setFont(context, 14 * SF, 400, 'italic');
      const commitText =
        link.commit_count === 1
          ? '1 commit by'
          : `${link.commit_count} commits by`;
      width = context.measureText(commitText).width * 1.25;
      if (width > maxWidth) maxWidth = width;

      setFont(context, 14 * SF, 700, 'normal');
      width =
        context.measureText(
          clickedData.contributor_name,
        ).width * 1.25;
      if (width > maxWidth) maxWidth = width;

      setFont(context, 14 * SF, 400, 'normal');
      let dateText = '';
      if (
        formatDateExact(link.commit_sec_min) ===
        formatDateExact(link.commit_sec_max)
      ) {
        dateText = `On ${formatDateExact(link.commit_sec_max)}`;
      } else if (
        formatDate(link.commit_sec_min) ===
        formatDate(link.commit_sec_max)
      ) {
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
 * Draws a tooltip above a node with detailed information.
 */
export function drawTooltip(
  context: CanvasRenderingContext2D,
  d: VisualizationNode,
  config: TooltipConfig,
  interactionState: InteractionState,
  _central_repo: VisualizationNode | null,
  formatDate: (value: Date) => string,
  formatDateExact: (value: Date) => string,
  formatDigit: (value: number) => string,
): void {
  const { SF, COLOR_BACKGROUND, COLOR_TEXT, COLOR_CONTRIBUTOR, COLOR_REPO, COLOR_OWNER, orgNickname } =
    config;

  let line_height = 1.2;
  let font_size: number;
  let text: string;

  const nodeData = d.data as Record<string, any>;
  const max_radius = d.max_radius;

  const x_base = d.x;
  const y_base = d.y + (d.y < 0 ? 1 : -1) * (max_radius ? max_radius : d.r);

  let H: number, W: number;

  if (d.type === 'contributor') {
    H = 125;
    W = 320;
  } else if (d.type === 'owner') {
    H = 155;
    W = 320;
  } else if (d.type === 'repo') {
    H = calculateRepoTooltipHeight(d, interactionState);
    W = calculateRepoTooltipWidth(
      context,
      d,
      interactionState,
      SF,
      formatDate,
      formatDateExact,
      formatDigit,
      orgNickname,
    );
  } else {
    H = 116;
    W = 320;
  }

  if (d.type === 'owner') {
    const connected_node_cloud = (d.connected_node_cloud || []);
    const sortedRepos = [...connected_node_cloud].sort(
      (a, b) =>
        ((b.data as Record<string, any>).forks || 0) -
        ((a.data as Record<string, any>).forks || 0),
    );
    const visibleRepos = sortedRepos.slice(0, OWNER_MAX_REPOS);

    font_size = 15;
    setFont(context, font_size * SF, 400, 'normal');
    nodeData.text_lines = [];
    text = '';
    visibleRepos.forEach((repo, i) => {
      let new_repo = `${(repo.data as Record<string, any>).name}${i < visibleRepos.length - 1 ? ' · ' : ''}`;
      if (
        context.measureText(`${text}${new_repo}`).width * 1.25 >
        0.85 * W * SF
      ) {
        nodeData.text_lines.push(text.replace(/ · $/, ''));
        text = new_repo;
      } else {
        text += new_repo;
      }
    });
    if (text !== '') nodeData.text_lines.push(text.replace(/ · $/, ''));

    const hiddenRepoCount = connected_node_cloud.length - OWNER_MAX_REPOS;
    let lineCount = nodeData.text_lines.length as number;
    if (hiddenRepoCount > 0) lineCount += 1;
    H += lineCount * (font_size * 1.4);

    let tW = 0;
    setFont(context, 22 * SF, 700, 'normal');
    tW = context.measureText(nodeData.owner).width * 1.25;
    setFont(context, 15 * SF, 400, 'normal');
    (nodeData.text_lines as string[]).forEach((t: string) => {
      let line_width = context.measureText(t).width * 1.25;
      if (line_width > tW) tW = line_width;
    });
    if (tW + 40 * SF > W * SF) W = tW / SF + 40;
  } else if (d.type === 'contributor') {
    setFont(context, 20 * SF, 700, 'normal');
    text = nodeData.contributor_name ?? nodeData.author_name;
    let tW = context.measureText(text).width * 1.25;
    if (tW + 40 * SF > W * SF) W = tW / SF + 40;
    const repoCount = (nodeData.links_original as LinkData[] | undefined)?.length ?? 0;
    const totalCommits = (nodeData.total_commits as number) || 0;
    setFont(context, 14 * SF, 400, 'normal');
    const statsText = `${repoCount} ${repoCount === 1 ? 'repo' : 'repos'} · ${totalCommits.toLocaleString()} commits`;
    tW = context.measureText(statsText).width * 1.25;
    if (tW + 40 * SF > W * SF) W = tW / SF + 40;
  }

  const maxTooltipWidth = (window.innerWidth - 20) / SF;
  if (W > maxTooltipWidth) W = Math.max(maxTooltipWidth, 200);

  let H_OFFSET = d.y < 0 ? 20 : -H - 20;

  let x_clamped = x_base;
  const canvasHalfW = (context.canvas.width / SF) / 2;
  const leftEdge = x_clamped - W / 2;
  const rightEdge = x_clamped + W / 2;
  if (leftEdge * SF < -canvasHalfW * SF + 10) {
    x_clamped = -canvasHalfW + W / 2 + 10;
  } else if (rightEdge * SF > canvasHalfW * SF - 10) {
    x_clamped = canvasHalfW - W / 2 - 10;
  }

  context.save();
  context.translate(x_clamped * SF, (y_base + H_OFFSET) * SF);

  let x = 0;
  let y = 0;
  let COL: string = '';
  if (d.type === 'contributor') COL = COLOR_CONTRIBUTOR;
  else if (d.type === 'repo') COL = COLOR_REPO;
  else if (d.type === 'owner') COL = COLOR_OWNER;

  const bgColor = COLOR_BACKGROUND || '#f7f7f7';
  const rectX = (x - W / 2) * SF;
  const rectY = y * SF;
  const rectW = W * SF;
  const rectH = H * SF;
  context.shadowBlur = 3 * SF;
  context.shadowColor = '#d4d4d4';
  context.fillStyle = bgColor;
  context.fillRect(rectX, rectY, rectW, rectH);
  context.shadowBlur = 0;

  context.fillStyle = COL;
  context.fillRect((x - W / 2) * SF, y * SF, 4 * SF, H * SF);

  context.textAlign = 'left';
  context.textBaseline = 'middle';

  const xLeft = x - W / 2 + TOOLTIP_PADDING;

  y = 26;
  font_size = 15;
  setFont(context, font_size * SF, 400, 'italic');
  context.fillStyle = COL;
  text = '';
  if (d.type === 'contributor') text = 'Contributor';
  else if (d.type === 'repo') text = 'Repository';
  else if (d.type === 'owner') text = 'Owner';
  renderText(context, text, xLeft * SF, y * SF, 2.5 * SF);

  context.fillStyle = COLOR_TEXT;
  y += 30;

  if (d.type === 'contributor') {
    font_size = 20;
    setFont(context, font_size * SF, 700, 'normal');
    text = nodeData.contributor_name ?? nodeData.author_name;
    renderText(context, text, xLeft * SF, y * SF, 1.25 * SF);

    y += 26;
    const contribRepoCount = (nodeData.links_original as LinkData[] | undefined)?.length ?? 0;
    const contribTotalCommits = (nodeData.total_commits as number) || 0;
    font_size = 14;
    context.globalAlpha = 0.6;
    setFont(context, font_size * SF, 400, 'normal');
    text = `${contribRepoCount} ${contribRepoCount === 1 ? 'repo' : 'repos'} · ${contribTotalCommits.toLocaleString()} commits`;
    renderText(context, text, xLeft * SF, y * SF, 1.25 * SF);
    context.globalAlpha = 1;
  } else if (d.type === 'owner') {
    font_size = 22;
    setFont(context, font_size * SF, 700, 'normal');
    renderText(context, nodeData.owner, xLeft * SF, y * SF, 1.25 * SF);

    y += 28;
    font_size = 14;
    context.globalAlpha = 0.6;
    setFont(context, font_size * SF, 400, 'normal');
    const connected_node_cloud = (d.connected_node_cloud || []);
    const repoCount = connected_node_cloud.length;
    renderText(
      context,
      `${repoCount} ${repoCount === 1 ? 'repository' : 'repositories'}`,
      xLeft * SF,
      y * SF,
      1.25 * SF,
    );

    drawSectionDivider(context, y + 14, W, x, SF);

    y += 30;
    font_size = 14;
    context.globalAlpha = 0.6;
    setFont(context, font_size * SF, 400, 'italic');
    renderText(context, 'Repositories', xLeft * SF, y * SF, 2 * SF);

    font_size = 15;
    y += font_size * 1.4 + 4;
    context.globalAlpha = 0.9;
    setFont(context, font_size * SF, 400, 'normal');
    (nodeData.text_lines as string[]).forEach((l: string) => {
      renderText(context, l, xLeft * SF, y * SF, 1.25 * SF);
      y += font_size * 1.4;
    });

    const hiddenCount = connected_node_cloud.length - OWNER_MAX_REPOS;
    if (hiddenCount > 0) {
      context.globalAlpha = 0.5;
      setFont(context, font_size * SF, 400, 'italic');
      renderText(
        context,
        `& ${hiddenCount} more`,
        xLeft * SF,
        y * SF,
        1.25 * SF,
      );
      context.globalAlpha = 0.9;
    }
  } else if (d.type === 'repo') {
    font_size = 22;
    setFont(context, font_size * SF, 700, 'normal');
    renderText(context, `${nodeData.owner}/`, xLeft * SF, y * SF, 1.25 * SF);
    renderText(
      context,
      nodeData.name,
      xLeft * SF,
      (y + line_height * font_size) * SF,
      1.25 * SF,
    );

    y += 58;
    font_size = 16;
    context.globalAlpha = 0.7;
    setFont(context, font_size * SF, 400, 'normal');
    renderText(
      context,
      `Created in ${formatDate(nodeData.createdAt)}`,
      xLeft * SF,
      y * SF,
      1.25 * SF,
    );
    y += 26;
    renderText(
      context,
      `Last updated in ${formatDate(nodeData.updatedAt)}`,
      xLeft * SF,
      y * SF,
      1.25 * SF,
    );

    drawSectionDivider(context, y + 18, W, x, SF);

    y += 36;
    const repoData = nodeData as RepoCardData;
    renderStatsLine(context, repoData, xLeft, y, SF, formatDigit);

    const statsY = y;
    drawSectionDivider(context, y + 17, W, x, SF);
    y = renderLanguages(context, repoData, xLeft, y, SF);

    if (nodeData.totalContributors && nodeData.totalContributors > 0) {
      if (y > statsY) drawSectionDivider(context, y + 4, W, x, SF);
    }
    y = renderCommunityMetrics(context, repoData, xLeft, y, SF, orgNickname);

    if (nodeData.license) {
      if (y > statsY) drawSectionDivider(context, y + 4, W, x, SF);
    }
    y = renderLicense(context, repoData, xLeft, y, SF);

    if (nodeData.archived) {
      if (y > statsY) drawSectionDivider(context, y + 4, W, x, SF);
    }
    y = renderArchivedBadge(context, repoData, xLeft, y, SF);

    context.fillStyle = COLOR_TEXT;
    context.globalAlpha = 0.9;

    if (
      interactionState.clickActive &&
      interactionState.clickedNode &&
      interactionState.clickedNode.type === 'contributor'
    ) {
      const clickedData = interactionState.clickedNode.data as Record<string, any>;
      let link = clickedData.links_original.find(
        (l: LinkData) => l.repo === d.id,
      );
      if (!link) {
        context.restore();
        return;
      }
      let num_commits = link.commit_count;

      y += 24;
      font_size = 14;
      context.globalAlpha = 0.6;
      setFont(context, font_size * SF, 400, 'italic');
      text =
        num_commits === 1 ? '1 commit by' : `${num_commits} commits by`;
      renderText(context, text, xLeft * SF, y * SF, 2 * SF);

      y += 15;
      font_size = 14;
      context.globalAlpha = 0.9;
      setFont(context, font_size * SF, 700, 'normal');
      renderText(
        context,
        clickedData.contributor_name,
        xLeft * SF,
        y * SF,
        1.25 * SF,
      );

      y += 17;
      font_size = 14;
      context.globalAlpha = 0.6;
      setFont(context, font_size * SF, 400, 'normal');
      if (
        formatDateExact(link.commit_sec_min) ===
        formatDateExact(link.commit_sec_max)
      )
        text = `On ${formatDateExact(link.commit_sec_max)}`;
      else if (
        formatDate(link.commit_sec_min) ===
        formatDate(link.commit_sec_max)
      )
        text = `In ${formatDate(link.commit_sec_max)}`;
      else
        text = `Between ${formatDate(link.commit_sec_min)} / ${formatDate(link.commit_sec_max)}`;
      renderText(context, text, xLeft * SF, y * SF, 1.25 * SF);
    }
  }

  context.restore();
}
