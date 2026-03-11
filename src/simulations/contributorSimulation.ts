/**
 * Force simulation for repos with a single DevSeed contributor
 *
 * Runs a force simulation to position single-degree repositories around their contributor nodes.
 * Each contributor node gets a "cloud" of connected repositories positioned around it.
 *
 * @module simulations/contributorSimulation
 */

import * as d3 from 'd3';
import { getLinkNodeId } from '../utils/validation';
import { sqrt, max } from '../utils/helpers';
import type { VisualizationNode, LinkData } from '../types';

/**
 * Run force simulation for contributor nodes and their connected single-degree repositories
 */
export function runContributorSimulation(
  nodes: VisualizationNode[],
  links: LinkData[],
): void {
  nodes
    .filter((d) => d.type === "contributor")
    .forEach((d) => {
      d.x = (d as any).fx = 0;
      d.y = (d as any).fy = 0;
    });

  nodes
    .filter((d) => d.type === "contributor")
    .forEach((d) => {
      const nodes_to_contributor = nodes.filter(
        (n) =>
          links.find(
            (l) => getLinkNodeId(l.source) === d.id && getLinkNodeId(l.target) === n.id && n.degree === 1,
          ) ||
          links.find(
            (l) =>
              getLinkNodeId(l.source) === d.id &&
              getLinkNodeId(l.target) === n.id &&
              n.type === "owner" &&
              (n.data as any).single_contributor === true,
          ) ||
          n.id === d.id,
      );

      (d as any).connected_single_repo = nodes_to_contributor.filter(
        (n) => n.type === "repo" || n.type === "owner",
      );

      if (typeof localStorage !== 'undefined' && localStorage.getItem('debug-contributor-network') === 'true') {
        console.log(`Contributor ${d.id}: connected repos = ${(d as any).connected_single_repo.length}`);
        if ((d as any).connected_single_repo.length === 0) {
          const allConnect = links.filter(l => getLinkNodeId(l.source) === d.id);
          console.log(`  - Actual links from contributor: ${allConnect.length}`);
          if (allConnect.length > 0) {
            const targetId = getLinkNodeId(allConnect[0].target);
            const targetNode = nodes.find(n => n.id === targetId);
            console.log(`  - First target: ${targetId}, degree: ${targetNode ? targetNode.degree : '?'}`);
          }
        }
      }

      const links_contributor: { source: string; target: string }[] = [];
      (d as any).connected_single_repo.forEach((n: VisualizationNode) => {
        links_contributor.push({ source: d.id, target: n.id });
      });

      nodes_to_contributor.forEach((n) => {
        n.x = (d as any).fx + Math.random() * (Math.random() > 0.5 ? 1 : -1);
        n.y = (d as any).fy + Math.random() * (Math.random() > 0.5 ? 1 : -1);
      });

      const simulation = d3
        .forceSimulation<VisualizationNode>()
        .nodes(nodes_to_contributor)
        .force(
          "link",
          d3
            .forceLink<VisualizationNode, any>()
            .id((d) => d.id)
            .strength(0),
        )
        .force("charge", d3.forceManyBody().strength(-10))
        .force(
          "collide",
          d3.forceCollide<VisualizationNode>((n) => n.r + 2).strength(0.1),
        )
        .force("x", d3.forceX<VisualizationNode>().x((d as any).fx).strength(0.1))
        .force("y", d3.forceY<VisualizationNode>().y((d as any).fy).strength(0.1));

      simulation.nodes(nodes_to_contributor).stop();

      (simulation.force("link") as d3.ForceLink<VisualizationNode, any>).links(links_contributor);

      const n_ticks = 200;
      for (let i = 0; i < n_ticks; ++i) {
        simulation.tick();
        (simulation.force("collide") as d3.ForceCollide<VisualizationNode>).strength(Math.pow(i / n_ticks, 2) * 0.8);
      }

      (d as any).max_radius = d3.max(nodes_to_contributor, (n) =>
        sqrt((n.x - d.x) ** 2 + (n.y - d.y) ** 2),
      );
      const max_radius_node = nodes_to_contributor.find(
        (n) => sqrt((n.x - d.x) ** 2 + (n.y - d.y) ** 2) === (d as any).max_radius,
      );
      (d as any).max_radius = max((d as any).max_radius + (max_radius_node ? max_radius_node.r : 0), d.r);
      if (typeof localStorage !== 'undefined' && localStorage.getItem('debug-contributor-network') === 'true') {
        console.log(`Contributor ${d.id}: max_radius = ${(d as any).max_radius}`);
      }
    });
}
