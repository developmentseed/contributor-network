/**
 * Force simulation for repos owned by a single organization
 *
 * Runs a force simulation to position repositories around their owner nodes.
 * Each owner node gets a "cloud" of connected repositories positioned around it.
 *
 * @module simulations/ownerSimulation
 */

import * as d3 from 'd3';
import { getLinkNodeId } from '../utils/validation';
import { sqrt, max, min } from '../utils/helpers';
import { LAYOUT } from '../config/theme';
import type { VisualizationNode, LinkData } from '../types';

/**
 * Run force simulation for owner nodes and their connected repositories
 */
export function runOwnerSimulation(
  nodes: VisualizationNode[],
  links: LinkData[],
): void {
  nodes
    .filter((d) => d.type === "owner")
    .forEach((d) => {
      d.x = d.fx = 0;
      d.y = d.fy = 0;
    });

  nodes
    .filter((d) => d.type === "owner")
    .forEach((d) => {
      const nodes_connected = nodes.filter(
        (n) =>
          links.find(
            (l) => getLinkNodeId(l.source) === d.id && getLinkNodeId(l.target) === n.id && n.degree === 1,
          ) || n.id === d.id,
      );

      d.connected_node_cloud = nodes_connected.filter(
        (n) => n.type === "repo",
      );


      const links_connected = links.filter(
        (l) =>
          getLinkNodeId(l.source) === d.id && nodes_connected.find((n) => n.id === getLinkNodeId(l.target)),
      );

      nodes_connected.forEach((n) => {
        n.x = d.fx! + Math.random() * (Math.random() > 0.5 ? 1 : -1);
        n.y = d.fy! + Math.random() * (Math.random() > 0.5 ? 1 : -1);
      });

      const simulation = d3
        .forceSimulation<VisualizationNode>()
        .force(
          "link",
          d3
            .forceLink<VisualizationNode, LinkData>()
            .id((d) => d.id)
            .strength(0),
        )
        .force(
          "collide",
          d3
            .forceCollide<VisualizationNode>()
            .radius((n) => {
              let r: number;
              if (n.id === d.id) {
                if ((d.data as any).single_contributor) r = d.r + 2;
                else r = d.r + min(14, max(10, d.r));
              } else r = n.r + LAYOUT.ownerRepoCollideExtra;
              return r;
            })
            .strength(0),
        )
        .force("charge", d3.forceManyBody().strength(LAYOUT.ownerRepoRepulsion))
        .force("x", d3.forceX<VisualizationNode>().x(d.fx!).strength(0.1))
        .force("y", d3.forceY<VisualizationNode>().y(d.fy!).strength(0.1));

      simulation.nodes(nodes_connected).stop();

      (simulation.force("link") as d3.ForceLink<VisualizationNode, LinkData>).links(links_connected);

      const n_ticks = 200;
      for (let i = 0; i < n_ticks; ++i) {
        simulation.tick();
        (simulation.force("collide") as d3.ForceCollide<VisualizationNode>).strength(Math.pow(i / n_ticks, 2) * LAYOUT.ownerCollideStrength);
      }

      d.max_radius = d3.max(nodes_connected, (n) =>
        sqrt((n.x - d.x) ** 2 + (n.y - d.y) ** 2),
      );
      const max_radius_node = nodes_connected.find(
        (n) => sqrt((n.x - d.x) ** 2 + (n.y - d.y) ** 2) === d.max_radius,
      );
      d.max_radius = max(d.max_radius! + max_radius_node!.r, d.r);

      delete (d as any).fx;
      delete (d as any).fy;
    });
}
