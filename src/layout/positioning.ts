/**
 * Contributor Node Positioning Module
 *
 * Calculates the radius for the contributor ring and positions contributor nodes
 * in a circle around the viewport center (0, 0). Also handles positioning of connected
 * single-degree repositories relative to their contributors.
 *
 * @module layout/positioning
 */

import { TAU, PI, cos, sin } from '../utils/helpers';
import type { VisualizationNode, ContributorData } from '../types';

const RING_WIDTH_MULTIPLIER = 2.3;
const MIN_RADIUS_PER_CONTRIBUTOR = 15;
const ABSOLUTE_MIN_RADIUS = 200;

export interface PositioningData {
  nodes: VisualizationNode[];
  contributors: ContributorData[];
}

export interface PositioningConfig {
  CONTRIBUTOR_PADDING: number;
}

export interface PositioningResult {
  RADIUS_CONTRIBUTOR: number;
  CONTRIBUTOR_RING_WIDTH: number;
}

/**
 * Position contributor nodes in a ring around the viewport center (0, 0)
 *
 * This function:
 * - Calculates the optimal radius for the contributor ring based on node sizes
 * - Positions contributors evenly around the circle
 * - Handles positioning of connected single-degree repositories
 * - Updates RADIUS_CONTRIBUTOR and CONTRIBUTOR_RING_WIDTH
 */
export function positionContributorNodes(
  data: PositioningData,
  config: PositioningConfig,
): PositioningResult {
  const { nodes, contributors } = data;
  const { CONTRIBUTOR_PADDING } = config;

  const CENTER_X = 0;
  const CENTER_Y = 0;

  if (!Array.isArray(nodes) || nodes.length === 0) {
    console.warn('positionContributorNodes: nodes array is empty or invalid');
    return {
      RADIUS_CONTRIBUTOR: ABSOLUTE_MIN_RADIUS,
      CONTRIBUTOR_RING_WIDTH: 0
    };
  }

  const contributorNodes = nodes.filter((d) => d.type === "contributor");
  contributorNodes.forEach((d) => {
    if (!(d as any).max_radius || !isFinite((d as any).max_radius) || (d as any).max_radius <= 0) {
      (d as any).max_radius = d.r || 20;
    }
    if (!(d as any).connected_single_repo) {
      (d as any).connected_single_repo = [];
    }
  });

  let sum_radius = contributorNodes
    .reduce((acc, curr) => acc + (curr as any).max_radius * 2, 0);
  sum_radius += contributors.length * CONTRIBUTOR_PADDING;
  let RADIUS_CONTRIBUTOR = sum_radius / TAU;

  const MIN_RADIUS = Math.max(ABSOLUTE_MIN_RADIUS, contributorNodes.length * MIN_RADIUS_PER_CONTRIBUTOR);
  let useEvenSpacing = false;
  if (!isFinite(RADIUS_CONTRIBUTOR) || RADIUS_CONTRIBUTOR < MIN_RADIUS) {
    console.warn(`RADIUS_CONTRIBUTOR too small (${RADIUS_CONTRIBUTOR}), using minimum ${MIN_RADIUS}`);
    RADIUS_CONTRIBUTOR = MIN_RADIUS;
    useEvenSpacing = true;
  }

  const CONTRIBUTOR_RING_WIDTH = ((RADIUS_CONTRIBUTOR * RING_WIDTH_MULTIPLIER) / 2 - RADIUS_CONTRIBUTOR) * 2;

  const evenAngleIncrement = TAU / contributorNodes.length;

  console.log(`positionContributorNodes: ${contributorNodes.length} contributors, sum_radius=${sum_radius}, RADIUS_CONTRIBUTOR=${RADIUS_CONTRIBUTOR}, useEvenSpacing=${useEvenSpacing}`);

  let angle = 0;
  contributorNodes.forEach((d, i) => {
    if ((d as any).connected_single_repo && (d as any).connected_single_repo.length > 0) {
      (d as any).connected_single_repo.forEach((repo: VisualizationNode) => {
        repo.x -= d.x;
        repo.y -= d.y;
      });
    }

    if (i < 3) {
      console.log(`Contributor ${i} "${d.id}": max_radius=${(d as any).max_radius}, r=${d.r}, center=(${CENTER_X}, ${CENTER_Y})`);
    }

    const contributor_arc = (d as any).max_radius * 2 + CONTRIBUTOR_PADDING;
    let contributor_angle: number;
    if (useEvenSpacing) {
      contributor_angle = evenAngleIncrement / 2;
    } else {
      contributor_angle = contributor_arc / RADIUS_CONTRIBUTOR / 2;
    }

    const radius_drawn = RADIUS_CONTRIBUTOR;
    d.x =
      CENTER_X +
      radius_drawn * cos(angle + contributor_angle - PI / 2);
    d.y =
      CENTER_Y +
      radius_drawn * sin(angle + contributor_angle - PI / 2);
    (d as any).contributor_angle = angle + contributor_angle - PI / 2;
    angle += useEvenSpacing ? evenAngleIncrement : contributor_angle * 2;

    (d as any).fx = d.x;
    (d as any).fy = d.y;

    if ((d as any).connected_single_repo && (d as any).connected_single_repo.length > 0) {
      (d as any).connected_single_repo.forEach((repo: VisualizationNode) => {
        repo.x += d.x;
        repo.y += d.y;

        (repo as any).fx = repo.x;
        (repo as any).fy = repo.y;
      });
    }
  });

  return {
    RADIUS_CONTRIBUTOR,
    CONTRIBUTOR_RING_WIDTH
  };
}
