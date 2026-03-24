/**
 * Shape drawing utilities (circles, arcs, links, patterns)
 * @module render/shapes
 */

import * as d3 from 'd3';
import { TAU } from '../utils/helpers';
import type { VisualizationNode, InteractionState, LinkData } from '../types';

interface DrawNodeConfig {
  COLOR_BACKGROUND: string;
  max: (...values: number[]) => number;
}

interface DrawLinkConfig {
  COLOR_LINK: string;
}

interface ArcLine {
  source: { x: number; y: number };
  target: { x: number; y: number };
  center?: { x: number; y: number };
  r: number;
  sign: boolean;
}

/**
 * Draws a circle on the canvas.
 */
export function drawCircle(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  SF: number,
  r: number = 10,
  begin: boolean = true,
  stroke: boolean = false,
): void {
  if (begin === true) context.beginPath();
  context.moveTo((x + r) * SF, y * SF);
  context.arc(x * SF, y * SF, r * SF, 0, TAU);
  if (begin && stroke == false) context.fill();
}

/**
 * Draws a curved arc for a line.
 */
export function drawCircleArc(
  context: CanvasRenderingContext2D,
  SF: number,
  line: ArcLine,
): void {
  if (!line.center) {
    context.lineTo(line.target.x * SF, line.target.y * SF);
    return;
  }

  let center = line.center;
  let ang1 = Math.atan2(
    line.source.y * SF - center.y * SF,
    line.source.x * SF - center.x * SF,
  );
  let ang2 = Math.atan2(
    line.target.y * SF - center.y * SF,
    line.target.x * SF - center.x * SF,
  );
  context.arc(
    center.x * SF,
    center.y * SF,
    line.r * SF,
    ang1,
    ang2,
    line.sign,
  );
}

/**
 * Draws a line on the canvas.
 */
export function drawLine(
  context: CanvasRenderingContext2D,
  SF: number,
  line: ArcLine,
): void {
  context.beginPath();
  context.moveTo(line.source.x * SF, line.source.y * SF);
  if (line.center) drawCircleArc(context, SF, line);
  else context.lineTo(line.target.x * SF, line.target.y * SF);
  context.stroke();
}

/**
 * Draws a node (circle) on the canvas.
 */
export function drawNode(
  context: CanvasRenderingContext2D,
  SF: number,
  d: VisualizationNode,
  config: DrawNodeConfig,
  interactionState: InteractionState,
): void {
  const { COLOR_BACKGROUND, max } = config;

  const isActive = interactionState.hoverActive || interactionState.clickActive;
  context.shadowBlur = isActive ? 0 : max(2, d.r * 0.2) * SF;
  context.shadowColor = '#f7f7f7';

  context.fillStyle = d.color;
  drawCircle(context, d.x, d.y, SF, d.r);
  context.shadowBlur = 0;

  context.strokeStyle = COLOR_BACKGROUND;
  context.lineWidth = max(isActive ? 1.5 : 1, d.r * 0.07) * SF;
  drawCircle(context, d.x, d.y, SF, d.r, true, true);
  context.stroke();
}

/**
 * Draws an arc around a repository node showing contributor activity time range.
 */
export function drawNodeArc(
  context: CanvasRenderingContext2D,
  SF: number,
  d: VisualizationNode,
  interactionState: InteractionState,
  COLOR_CONTRIBUTOR: string,
  central_repo: VisualizationNode | null,
): void {
  const activeNode = interactionState.hoveredNode ?? interactionState.clickedNode;
  const isActive = interactionState.hoverActive || interactionState.clickActive;
  if (
    isActive &&
    activeNode &&
    activeNode.type === 'contributor' &&
    d.type === 'repo'
  ) {
    let link = (activeNode.data as { links_original: LinkData[] }).links_original.find(
      (p) => p.repo === d.id,
    );
    if (link) timeRangeArc(context, SF, d, d, link, COLOR_CONTRIBUTOR, central_repo);
  }
}

/**
 * Draws a stroked ring around a hovered node.
 */
export function drawHoverRing(
  context: CanvasRenderingContext2D,
  d: VisualizationNode,
  SF: number,
  central_repo: VisualizationNode | null,
): void {
  let r = d.r + (d.type === 'contributor' ? 9 : 7);
  context.beginPath();
  context.moveTo((d.x + r) * SF, d.y * SF);
  context.arc(d.x * SF, d.y * SF, r * SF, 0, TAU);
  context.strokeStyle = d.color;
  context.lineWidth = 3 * SF;
  context.stroke();
}

export function drawNodeGlow(
  context: CanvasRenderingContext2D,
  SF: number,
  d: VisualizationNode,
  intensity: number,
): void {
  const glowRadius = d.r * (intensity > 0.2 ? 2.5 : 1.5);
  const cx = d.x * SF;
  const cy = d.y * SF;
  const r = glowRadius * SF;

  const gradient = context.createRadialGradient(cx, cy, 0, cx, cy, r);
  gradient.addColorStop(0, hexToRgba(d.color, intensity));
  gradient.addColorStop(1, hexToRgba(d.color, 0));

  context.save();
  context.fillStyle = gradient;
  context.fillRect(cx - r, cy - r, r * 2, r * 2);
  context.restore();
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Draws a tiny arc around a node showing contributor involvement time range.
 */
export function timeRangeArc(
  context: CanvasRenderingContext2D,
  SF: number,
  d: VisualizationNode,
  repo: VisualizationNode,
  link: LinkData,
  COL: string,
  central_repo: VisualizationNode | null,
): void {
  context.save();
  context.translate(d.x * SF, d.y * SF);

  context.fillStyle = COL;
  context.strokeStyle = COL;

  const repoData = repo.data as { createdAt: Date; updatedAt: Date };

  const scale_involved_range = d3
    .scaleLinear()
    .domain([repoData.createdAt as unknown as number, repoData.updatedAt as unknown as number])
    .range([0, TAU]);

  let r_inner = d.r + (d.type === 'contributor' ? 2.5 : 1);
  let r_outer = r_inner + 3;

  const arc = d3
    .arc()
    .innerRadius(r_inner * SF)
    .outerRadius(r_outer * SF)
    .startAngle(scale_involved_range(link.commit_sec_min as unknown as number)!)
    .endAngle(scale_involved_range(link.commit_sec_max as unknown as number)!)
    .context(context);

  context.beginPath();
  arc(null as any);
  context.fill();

  context.restore();
}

/**
 * Fills a circle with a diagonal hatch pattern.
 */
export function drawHatchPattern(
  context: CanvasRenderingContext2D,
  radius: number,
  angle: number,
  SF: number,
  color: string,
  sin: (x: number) => number,
): void {
  context.save();
  context.beginPath();
  context.arc(0, 0, radius, 0, TAU);
  context.clip();

  const lW = 1.5 * SF;
  const step = 4 * lW * sin(angle / 2);

  context.lineWidth = lW;
  context.strokeStyle = color;
  for (let x = -2.5 * radius; x < 2.5 * radius; x += step) {
    context.beginPath();
    context.moveTo(x, -radius);
    context.lineTo(x + radius * Math.tan(angle / 2), radius);
    context.stroke();
  }
  context.restore();
}

/**
 * Draws a link between source and target nodes.
 */
export function drawLink(
  context: CanvasRenderingContext2D,
  SF: number,
  l: LinkData,
  config: DrawLinkConfig,
  interactionState: InteractionState,
  calculateLinkGradient: (context: CanvasRenderingContext2D, l: LinkData) => void,
  calculateEdgeCenters: (l: LinkData, factor: number) => void,
  scale_link_width: (count: number) => number,
): void {
  const { COLOR_LINK } = config;

  const source = l.source as VisualizationNode;
  const target = l.target as VisualizationNode;

  if (
    !source ||
    !target ||
    typeof source.x !== 'number' ||
    typeof target.x !== 'number' ||
    !isFinite(source.x) ||
    !isFinite(source.y) ||
    !isFinite(target.x) ||
    !isFinite(target.y)
  ) {
    return;
  }

  if (source.x !== undefined && target.x !== undefined) {
    calculateLinkGradient(context, l);
    calculateEdgeCenters(l, 1);
    context.strokeStyle = (l.gradient as string) || COLOR_LINK;
  } else context.strokeStyle = COLOR_LINK;

  let line_width = scale_link_width(l.commit_count);

  const activeNode = interactionState.hoveredNode ?? interactionState.clickedNode;
  const isActive = interactionState.hoverActive || interactionState.clickActive;

  if (
    isActive &&
    activeNode &&
    activeNode.type === 'contributor' &&
    activeNode.data &&
    (activeNode.data as { links_original?: LinkData[] }).links_original &&
    source.type === 'owner' &&
    target.type === 'repo'
  ) {
    let link_original = (
      activeNode.data as { links_original: LinkData[] }
    ).links_original.find((p) => p.repo === target.id);
    if (link_original) line_width = scale_link_width(link_original.commit_count);
  }

  if (
    isActive &&
    activeNode &&
    activeNode.type === 'repo' &&
    activeNode.data &&
    (activeNode.data as { links_original?: LinkData[] }).links_original &&
    source.type === 'contributor' &&
    target.type === 'owner'
  ) {
    let link_original = (
      activeNode.data as { links_original: LinkData[] }
    ).links_original.find((p) => p.contributor_name === source.id);
    if (link_original) {
      context.globalAlpha = 0.25;
      context.lineWidth = line_width * SF;
      drawLine(context, SF, l as unknown as ArcLine);

      context.globalAlpha = 1.0;
      context.lineWidth = scale_link_width(link_original.commit_count) * SF;
      drawLine(context, SF, l as unknown as ArcLine);

      context.globalAlpha = 1.0;
      return;
    }
  }

  context.lineWidth = line_width * SF;
  drawLine(context, SF, l as unknown as ArcLine);
}

/**
 * Draws the contributor ring - a filled ring band where contributors are positioned.
 * Uses the "winding rule" technique: outer arc clockwise + inner arc counterclockwise
 * to create a filled ring shape (not just outlines).
 * Ring is centered at the viewport origin (0, 0).
 */
export function drawContributorRing(
  context: CanvasRenderingContext2D,
  SF: number,
  RADIUS_CONTRIBUTOR: number,
  CONTRIBUTOR_RING_WIDTH: number,
  COLOR_RING: string = '#CF3F02',
): void {
  const center_x = 0;
  const center_y = 0;

  const LW = CONTRIBUTOR_RING_WIDTH;

  const radius_inner = (RADIUS_CONTRIBUTOR - LW / 3) * SF;
  const radius_outer = (RADIUS_CONTRIBUTOR + (2 * LW) / 3) * SF;

  context.save();

  context.beginPath();
  context.moveTo(center_x + radius_outer, center_y);
  context.arc(center_x, center_y, radius_outer, 0, TAU);
  context.moveTo(center_x + radius_inner, center_y);
  context.arc(center_x, center_y, radius_inner, 0, TAU, true);

  context.fillStyle = COLOR_RING;
  context.globalAlpha = 0.05;
  context.fill();

  context.restore();
}
