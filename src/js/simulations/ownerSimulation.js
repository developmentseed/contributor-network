/**
 * Force simulation for repos owned by a single organization
 * 
 * Runs a force simulation to position repositories around their owner nodes.
 * Each owner node gets a "cloud" of connected repositories positioned around it.
 * 
 * @module simulations/ownerSimulation
 */

/**
 * Run force simulation for owner nodes and their connected repositories
 * 
 * @param {Array} nodes - All nodes in the visualization
 * @param {Array} links - All links between nodes
 * @param {Object} d3 - D3 library reference
 * @param {Function} getLinkNodeId - Helper to extract node ID from link source/target
 * @param {Function} sqrt - Math.sqrt function
 * @param {Function} max - Math.max function
 * @param {Function} min - Math.min function
 */
export function runOwnerSimulation(nodes, links, d3, getLinkNodeId, sqrt, max, min) {
  // First fix the nodes in the center - this is only temporarily
  nodes
    .filter((d) => d.type === "owner")
    .forEach((d, i) => {
      d.x = d.fx = 0;
      d.y = d.fy = 0;

      // // For testing
      // // Place the contributors in a grid of 10 columns
      // d.x = -WIDTH/4 + (i % 8) * 140
      // d.y = -HEIGHT/4 + Math.floor(i / 8) * 150
      // d.fx = d.x
      // d.fy = d.y
    }); // forEach

  // Next run a force simulation to place all the repositories
  nodes
    .filter((d) => d.type === "owner")
    .forEach((d) => {
      // Find all the nodes that are connected to this one with a degree of one, including the node itself
      // Note: Use getLinkNodeId() since D3 force simulations may have converted some refs to objects
      let nodes_connected = nodes.filter(
        (n) =>
          links.find(
            (l) => getLinkNodeId(l.source) === d.id && getLinkNodeId(l.target) === n.id && n.degree === 1,
          ) || n.id === d.id,
      );

      // If there are no nodes connected to this one, skip it
      // if(nodes_to_contributor.length <= 1) return

      // Save the list of repositories that are connected to this node
      d.connected_node_cloud = nodes_connected.filter(
        (n) => n.type === "repo",
      );

      // Get the links between this node and nodes_connected
      let links_connected = links.filter(
        (l) =>
          getLinkNodeId(l.source) === d.id && nodes_connected.find((n) => n.id === getLinkNodeId(l.target)),
      );

      // Let the nodes start on the location of the contributor node
      nodes_connected.forEach((n) => {
        n.x = d.fx + Math.random() * (Math.random() > 0.5 ? 1 : -1);
        n.y = d.fy + Math.random() * (Math.random() > 0.5 ? 1 : -1);
      }); // forEach

      /////////////////////////////////////////////////////////
      /////////////////////// Simulation //////////////////////
      /////////////////////////////////////////////////////////
      // Define the simulation
      let simulation = d3
        .forceSimulation()
        .force(
          "link",
          // There are links, but they have no strength
          d3
            .forceLink()
            .id((d) => d.id)
            .strength(0),
        )
        .force(
          "collide",
          // Use a non-overlap, but let it start out at strength 0
          d3
            .forceCollide()
            .radius((n) => {
              let r;
              if (n.id === d.id) {
                if (d.data.single_contributor) r = d.r + 2;
                else r = d.r + min(14, max(10, d.r));
              } else r = n.r + max(2, n.r * 0.2);
              return r;
            })
            .strength(0),
        )
        // .force("charge",
        //     d3.forceManyBody()
        //         .strength(-20)
        //         // .distanceMax(WIDTH / 3)
        // )
        // Keep the repo nodes want to stay close to the contributor node
        // so they try to spread out evenly around it
        .force("x", d3.forceX().x(d.fx).strength(0.1))
        .force("y", d3.forceY().y(d.fy).strength(0.1));

      simulation.nodes(nodes_connected).stop();
      // .on("tick", ticked)

      simulation.force("link").links(links_connected);

      //Manually "tick" through the network
      let n_ticks = 200;
      for (let i = 0; i < n_ticks; ++i) {
        simulation.tick();
        //Ramp up collision strength to provide smooth transition
        simulation.force("collide").strength(Math.pow(i / n_ticks, 2) * 0.8);
      } //for i
      // TEST - Draw the result
      // drawContributorBubbles(nodes_connected, links_connected)

      // Determine the farthest distance of the nodes (including its radius) to the owner node
      d.max_radius = d3.max(nodes_connected, (n) =>
        sqrt((n.x - d.x) ** 2 + (n.y - d.y) ** 2),
      );
      // Determine which node is the largest distance to the central node
      let max_radius_node = nodes_connected.find(
        (n) => sqrt((n.x - d.x) ** 2 + (n.y - d.y) ** 2) === d.max_radius,
      );
      // Get the overall radius to take into account for the next simulation and labeling
      d.max_radius = max(d.max_radius + max_radius_node.r, d.r);
      // See this as the new "node" radius that includes all of it's repos

      // Reset the fx and fy
      delete d.fx;
      delete d.fy;
    }); // forEach
} // function runOwnerSimulation
