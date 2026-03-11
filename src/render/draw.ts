/**
 * Main Drawing Module
 *
 * Orchestrates the rendering of the entire visualization by calling
 * the appropriate render functions for links, nodes, and labels.
 *
 * @module render/draw
 */

import { drawContributorRing } from './shapes';
import type { VisualizationNode, LinkData } from '../types';

type DrawLinkFn = (
  context: CanvasRenderingContext2D,
  SF: number,
  l: LinkData,
) => void;

type DrawNodeArcFn = (
  context: CanvasRenderingContext2D,
  SF: number,
  d: VisualizationNode,
) => void;

type DrawNodeFn = (
  context: CanvasRenderingContext2D,
  SF: number,
  d: VisualizationNode,
) => void;

type DrawNodeLabelFn = (
  context: CanvasRenderingContext2D,
  d: VisualizationNode,
) => void;

export interface DrawRenderFunctions {
  drawLink: DrawLinkFn;
  drawNodeArc: DrawNodeArcFn;
  drawNode: DrawNodeFn;
  drawNodeLabel: DrawNodeLabelFn;
}

export interface DrawData {
  nodes: VisualizationNode[];
  links: LinkData[];
  nodes_central?: VisualizationNode[];
}

export interface DrawConfig {
  WIDTH: number;
  HEIGHT: number;
  SF: number;
  COLOR_BACKGROUND: string;
  RADIUS_CONTRIBUTOR?: number;
  CONTRIBUTOR_RING_WIDTH?: number;
}

/**
 * Safely execute a render function with error handling.
 */
function safeRender(renderFn: Function, fnName: string, ...args: unknown[]): boolean {
  try {
    renderFn(...args);
    return true;
  } catch (error) {
    console.error(`Error in ${fnName}:`, error);
    return false;
  }
}

/**
 * Check if a node has valid, finite coordinates for rendering.
 */
function hasValidCoordinates(node: VisualizationNode | { x?: number; y?: number }): boolean {
  return (
    node != null &&
    typeof node.x === 'number' &&
    typeof node.y === 'number' &&
    isFinite(node.x) &&
    isFinite(node.y)
  );
}

/**
 * Draw the complete visualization.
 *
 * This function orchestrates the rendering of:
 * - Background fill
 * - Links between nodes
 * - Node arcs (time range indicators)
 * - Node circles
 * - Node labels
 *
 * Rendering order is important for visual layering:
 * 1. Links (bottom layer)
 * 2. Node arcs (time indicators, behind nodes)
 * 3. Node circles (main visual)
 * 4. Labels (top layer)
 */
export function draw(
  context: CanvasRenderingContext2D,
  data: DrawData,
  config: DrawConfig,
  renderFunctions: DrawRenderFunctions,
): void {
  const { nodes, links, nodes_central } = data;
  const { WIDTH, HEIGHT, SF, COLOR_BACKGROUND, RADIUS_CONTRIBUTOR, CONTRIBUTOR_RING_WIDTH } = config;
  const { drawLink, drawNodeArc, drawNode, drawNodeLabel } = renderFunctions;

  if (WIDTH === 0 || HEIGHT === 0) {
    console.warn('draw() called with invalid canvas size:', { WIDTH, HEIGHT, SF });
    return;
  }
  if (!Array.isArray(nodes) || nodes.length === 0) {
    console.warn('draw() called with no nodes');
    return;
  }

  if (typeof drawLink !== 'function') {
    console.error('draw(): drawLink must be a function');
    return;
  }
  if (typeof drawNodeArc !== 'function') {
    console.error('draw(): drawNodeArc must be a function');
    return;
  }
  if (typeof drawNode !== 'function') {
    console.error('draw(): drawNode must be a function');
    return;
  }
  if (typeof drawNodeLabel !== 'function') {
    console.error('draw(): drawNodeLabel must be a function');
    return;
  }

  const renderableNodes = nodes.filter((d) => {
    if (!hasValidCoordinates(d)) {
      console.warn(`Skipping node with invalid coordinates: ${d.id}`);
      return false;
    }
    return true;
  });

  context.save();

  links.forEach((l) => {
    if (
      hasValidCoordinates(l.source as VisualizationNode) &&
      hasValidCoordinates(l.target as VisualizationNode)
    ) {
      safeRender(drawLink, 'drawLink', context, SF, l);
    }
  });

  if (RADIUS_CONTRIBUTOR && CONTRIBUTOR_RING_WIDTH) {
    safeRender(
      drawContributorRing,
      'drawContributorRing',
      context,
      SF,
      RADIUS_CONTRIBUTOR,
      CONTRIBUTOR_RING_WIDTH,
    );
  }

  renderableNodes.forEach((d) => {
    safeRender(drawNodeArc, 'drawNodeArc', context, SF, d);
  });

  renderableNodes.forEach((d) => {
    safeRender(drawNode, 'drawNode', context, SF, d);
  });

  const labelNodes = nodes_central || nodes;
  labelNodes.forEach((d) => {
    if (!hasValidCoordinates(d)) return;
    safeRender(drawNodeLabel, 'drawNodeLabel', context, d);
  });

  context.restore();
}
