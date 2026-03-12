/**
 * Force simulation for repos shared between multiple contributors
 *
 * Runs a force simulation to position repositories that are shared between multiple contributors.
 * Uses bounding box collision detection to prevent label overlap.
 *
 * @module simulations/collaborationSimulation
 */

import * as d3 from 'd3';
import { bboxCollide } from 'd3-bboxCollide';
import { setOwnerFont, setRepoFont } from '../render/text';
import { getLinkNodeId } from '../utils/validation';
import { sqrt, max } from '../utils/helpers';
import { LAYOUT } from '../config/theme';
import type { VisualizationNode, LinkData } from '../types';

export interface CollaborationSimulationConfig {
  context: CanvasRenderingContext2D;
  scale_link_distance: d3.ScaleContinuousNumeric<number, number>;
  RADIUS_CONTRIBUTOR: number;
  INNER_RADIUS_FACTOR: number;
}

/**
 * Run force simulation for collaboration repositories
 *
 * @returns Array of central nodes used in the simulation
 */
export function runCollaborationSimulation(
  nodes: VisualizationNode[],
  links: LinkData[],
  config: CollaborationSimulationConfig,
): VisualizationNode[] {
  const { context, scale_link_distance, RADIUS_CONTRIBUTOR, INNER_RADIUS_FACTOR } = config;

  const simulation = d3
    .forceSimulation<VisualizationNode>()
    .force(
      "link",
      d3
        .forceLink<VisualizationNode, LinkData>()
        .id((d) => d.id)
        .distance((d) => scale_link_distance((d.target as VisualizationNode).degree) * LAYOUT.collaborationLinkMultiplier),
    )
    .force(
      "collide",
      bboxCollide<VisualizationNode>((d) => d.bbox!)
        .strength(0)
        .iterations(1),
    )
    .force(
      "charge",
      d3.forceManyBody().strength(LAYOUT.collaborationChargeStrength),
    )
    .force(
      "radial",
      d3.forceRadial<VisualizationNode>(0)
        .radius((d) => d.type === "owner" ? RADIUS_CONTRIBUTOR * LAYOUT.collaborationRadialFactor : 0)
        .strength((d) => d.type === "owner" ? LAYOUT.collaborationRadialStrength : 0),
    );

  const nodes_central = nodes.filter(
    (d) =>
      d.type === "contributor" ||
      (d.type === "owner" && (d.data as any).single_contributor == false) ||
      (d.type === "repo" &&
        (d.data as any).multi_repo_owner === false &&
        d.degree > 1),
  );
  nodes_central.forEach((d) => {
    d.node_central = true;
  });

  nodes_central.forEach((d) => {
    if (d.type === "contributor") {
      d.bbox = [
        [-d.max_radius!, -d.max_radius!],
        [d.max_radius!, d.max_radius!],
      ];
      return;
    }

    if (d.type === "owner") {
      setOwnerFont(context, 1);
    } else if (d.type === "repo") {
      setRepoFont(context, 1);
    }

    let text_size = context.measureText(d.label);

    if (d.type === "repo") {
      if (context.measureText((d.data as any).owner).width > text_size.width)
        text_size = context.measureText((d.data as any).owner);
    }

    let text_height =
      text_size.fontBoundingBoxAscent + text_size.fontBoundingBoxDescent;
    if (d.type === "repo") text_height *= 2;

    const r = d.type === "owner" ? d.max_radius! : d.r;
    const top = max(r, d.r + text_height);
    const w = max(r * 2, text_size.width * 1.25) + 14;

    d.bbox = [
      [-w / 2, -top],
      [w / 2, r],
    ];
  });

  const links_central = links.filter(
    (d) =>
      nodes_central.find((n) => n.id === getLinkNodeId(d.source)) &&
      nodes_central.find((n) => n.id === getLinkNodeId(d.target)),
  );

  simulation.nodes(nodes_central).stop();

  (simulation.force("link") as d3.ForceLink<VisualizationNode, LinkData>).links(links_central);

  const n_ticks = 300;
  for (let i = 0; i < n_ticks; ++i) {
    simulation.tick();
    simulationPlacementConstraints(nodes_central, RADIUS_CONTRIBUTOR, INNER_RADIUS_FACTOR);
    (simulation.force("collide") as ReturnType<typeof bboxCollide>).strength(Math.pow(i / n_ticks, 2) * LAYOUT.collaborationCollideStrength);
  }

  nodes_central.forEach((d) => {
    d.fx = d.x;
    d.fy = d.y;
  });

  nodes
    .filter((d) => d.type === "owner")
    .forEach((d) => {
      if (d.connected_node_cloud && d.connected_node_cloud.length > 0) {
        d.connected_node_cloud.forEach((repo: VisualizationNode) => {
          repo.x = d.x + repo.x;
          repo.y = d.y + repo.y;
        });
      }
    });

  function simulationPlacementConstraints(
    nodes: VisualizationNode[],
    RADIUS_CONTRIBUTOR: number,
    INNER_RADIUS_FACTOR: number,
  ): void {
    nodes.forEach((d) => {
      if (d.type === "repo" || d.type === "owner") {
        const dist = sqrt(d.x ** 2 + d.y ** 2);
        if (dist > RADIUS_CONTRIBUTOR * INNER_RADIUS_FACTOR) {
          d.x = (d.x / dist) * RADIUS_CONTRIBUTOR * INNER_RADIUS_FACTOR;
          d.y = (d.y / dist) * RADIUS_CONTRIBUTOR * INNER_RADIUS_FACTOR;
        }
      }
    });
  }

  return nodes_central;
}
