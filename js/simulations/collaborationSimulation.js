/**
 * Force simulation for repos shared between multiple contributors
 * 
 * Runs a force simulation to position repositories that are shared between multiple contributors.
 * Uses bounding box collision detection to prevent label overlap.
 * 
 * @module simulations/collaborationSimulation
 */

import { setOwnerFont, setRepoFont } from '../render/text.js';

/**
 * Run force simulation for collaboration repositories
 * 
 * @param {Array} nodes - All nodes in the visualization
 * @param {Array} links - All links between nodes
 * @param {Object} d3 - D3 library reference
 * @param {Function} getLinkNodeId - Helper to extract node ID from link source/target
 * @param {Function} sqrt - Math.sqrt function
 * @param {Function} max - Math.max function
 * @param {Object} config - Configuration object:
 *   - context: Canvas 2D context for text measurement
 *   - scale_link_distance: Scale function for link distances
 *   - RADIUS_CONTRIBUTOR: Radius for contributor positioning
 *   - INNER_RADIUS_FACTOR: Factor for inner radius constraint
 * @returns {Array} nodes_central - Array of central nodes used in the simulation
 */
export function runCollaborationSimulation(
  nodes,
  links,
  d3,
  getLinkNodeId,
  sqrt,
  max,
  config
) {
  const { context, scale_link_distance, RADIUS_CONTRIBUTOR, INNER_RADIUS_FACTOR } = config;
  let nodes_central;
  
  let simulation = d3
    .forceSimulation()
    .force(
      "link",
      d3
        .forceLink()
        .id((d) => d.id)
        .distance((d) => scale_link_distance(d.target.degree) * 5),
    )
    .force(
      "collide",
      //Make sure that the words don't overlap
      //https://github.com/emeeks/d3-bboxCollide
      d3
        .bboxCollide((d) => d.bbox)
        .strength(0)
        .iterations(1),
    )
    .force(
      "charge",
      d3.forceManyBody()
    );

  // Keep the nodes that are a sponsored "contributor" or a repo that has a degree > 1
  // Community contributors are excluded from the central simulation and positioned separately
  nodes_central = nodes.filter(
    (d) =>
      (d.type === "contributor" && d.tier !== "community") ||
      (d.type === "owner" && d.data.single_contributor == false) ||
      (d.type === "repo" &&
        d.data.multi_repo_owner === false &&
        d.degree > 1),
  );
  nodes_central.forEach((d) => {
    d.node_central = true;
  }); // forEach

  // Calculate the bounding box around the nodes including their label
  nodes_central.forEach((d) => {
    if (d.type === "contributor") {
      d.bbox = [
        [-d.max_radius, -d.max_radius],
        [d.max_radius, d.max_radius],
      ];
      return;
    } // if

    // Set the fonts
    if (d.type === "owner") {
      setOwnerFont(context, 1);
    } else if (d.type === "repo") {
      setRepoFont(context, 1);
    } // else

    let text_size = context.measureText(d.label);

    // In case the owner name is longer than the repo name
    if (d.type === "repo") {
      if (context.measureText(d.data.owner).width > text_size.width)
        text_size = context.measureText(d.data.owner);
    } // if

    let text_height =
      text_size.fontBoundingBoxAscent + text_size.fontBoundingBoxDescent;
    if (d.type === "repo") text_height *= 2;

    let r = d.type === "owner" ? d.max_radius : d.r;
    let top = max(r, d.r + text_height);
    let w = max(r * 2, text_size.width * 1.25) + 14;

    d.bbox = [
      [-w / 2, -top],
      [w / 2, r],
    ];
  }); // forEach

  // Only keep the links that have the nodes that are in the nodes_central array
  // Filter links to only those between nodes in nodes_central
  // Use getLinkNodeId() since D3 may have converted some refs to objects
  let links_central = links.filter(
    (d) =>
      nodes_central.find((n) => n.id === getLinkNodeId(d.source)) &&
      nodes_central.find((n) => n.id === getLinkNodeId(d.target)),
  );

  // Perform the simulation
  simulation.nodes(nodes_central).stop();

  simulation.force("link").links(links_central);

  //Manually "tick" through the network
  let n_ticks = 300;
  for (let i = 0; i < n_ticks; ++i) {
    simulation.tick();
    simulationPlacementConstraints(nodes_central, sqrt, max, RADIUS_CONTRIBUTOR, INNER_RADIUS_FACTOR);
    //Ramp up collision strength to provide smooth transition
    simulation.force("collide").strength(Math.pow(i / n_ticks, 2) * 0.7);
  } //for i

  // Once it's done, fix the positions of the nodes used in the simulation
  nodes_central.forEach((d) => {
    d.fx = d.x;
    d.fy = d.y;
  }); // forEach

  // Update the position of the repositories connected to an "owner" node
  nodes
    .filter((d) => d.type === "owner")
    .forEach((d) => {
      // Guard against missing connected_node_cloud
      if (d.connected_node_cloud && d.connected_node_cloud.length > 0) {
        d.connected_node_cloud.forEach((repo) => {
          repo.x = d.x + repo.x;
          repo.y = d.y + repo.y;
        }); // forEach
      }
    }); // forEach

  /////////////////////////////////////////////////////////////
  function simulationPlacementConstraints(nodes, sqrt, max, RADIUS_CONTRIBUTOR, INNER_RADIUS_FACTOR) {
    // Make sure the "repo" nodes cannot be placed farther away from the center than RADIUS_CONTRIBUTOR
    nodes.forEach((d) => {
      if (d.type === "repo" || d.type === "owner") {
        const dist = sqrt(d.x ** 2 + d.y ** 2);
        if (dist > RADIUS_CONTRIBUTOR * INNER_RADIUS_FACTOR) {
          d.x = (d.x / dist) * RADIUS_CONTRIBUTOR * INNER_RADIUS_FACTOR;
          d.y = (d.y / dist) * RADIUS_CONTRIBUTOR * INNER_RADIUS_FACTOR;
        } //if
      } //if
    }); // forEach
  } // simulationPlacementConstraints

  return nodes_central;
} // function runCollaborationSimulation
