/**
 * Force simulation for repos with a single DevSeed contributor
 * 
 * Runs a force simulation to position single-degree repositories around their contributor nodes.
 * Each contributor node gets a "cloud" of connected repositories positioned around it.
 * 
 * @module simulations/contributorSimulation
 */

/**
 * Run force simulation for contributor nodes and their connected single-degree repositories
 * 
 * @param {Array} nodes - All nodes in the visualization
 * @param {Array} links - All links between nodes
 * @param {Object} d3 - D3 library reference
 * @param {Function} getLinkNodeId - Helper to extract node ID from link source/target
 * @param {Function} sqrt - Math.sqrt function
 * @param {Function} max - Math.max function
 */
export function runContributorSimulation(nodes, links, d3, getLinkNodeId, sqrt, max) {
  // First fix the contributor nodes in the center - this is only temporarily
  nodes
    .filter((d) => d.type === "contributor")
    .forEach((d) => {
      d.x = d.fx = 0;
      d.y = d.fy = 0;
    }); // forEach

  // Next run a force simulation to place all the single-degree repositories
  nodes
    .filter((d) => d.type === "contributor")
    .forEach((d) => {
      // Find all the nodes that are connected to this one with a degree of one, including the contributor node itself
      // Note: Use getLinkNodeId() since D3 force simulations may have converted some refs to objects
      let nodes_to_contributor = nodes.filter(
        (n) =>
          links.find(
            (l) => getLinkNodeId(l.source) === d.id && getLinkNodeId(l.target) === n.id && n.degree === 1,
          ) ||
          links.find(
            (l) =>
              getLinkNodeId(l.source) === d.id &&
              getLinkNodeId(l.target) === n.id &&
              n.type === "owner" &&
              n.data.single_contributor === true,
          ) ||
          n.id === d.id,
      );

      // Save the list of repositories that are connected to this contributor (with a degree of one)
      d.connected_single_repo = nodes_to_contributor.filter(
        (n) => n.type === "repo" || n.type === "owner",
      );

      if (typeof localStorage !== 'undefined' && localStorage.getItem('debug-contributor-network') === 'true') {
        console.log(`Contributor ${d.id}: connected repos = ${d.connected_single_repo.length}`);
        if (d.connected_single_repo.length === 0) {
          // Check why?
          const allConnect = links.filter(l => getLinkNodeId(l.source) === d.id);
          console.log(`  - Actual links from contributor: ${allConnect.length}`);
          if (allConnect.length > 0) {
            const targetId = getLinkNodeId(allConnect[0].target);
            const targetNode = nodes.find(n => n.id === targetId);
            console.log(`  - First target: ${targetId}, degree: ${targetNode ? targetNode.degree : '?'}`);
          }
        }
      }

      let links_contributor = [];
      d.connected_single_repo.forEach((n) => {
        links_contributor.push({ source: d.id, target: n.id });
      });

      // Let the nodes start on the location of the contributor node
      nodes_to_contributor.forEach((n) => {
        n.x = d.fx + Math.random() * (Math.random() > 0.5 ? 1 : -1);
        n.y = d.fy + Math.random() * (Math.random() > 0.5 ? 1 : -1);
      }); // forEach

      /////////////////////////////////////////////////////////
      /////////////////////// Simulation //////////////////////
      /////////////////////////////////////////////////////////
      // Define the simulation
      let simulation = d3
        .forceSimulation()
        .nodes(nodes_to_contributor)
        .force(
          "link",
          // There are links, but they have no strength (like singleOwnerForceSimulation)
          d3
            .forceLink()
            .id((d) => d.id)
            .strength(0),
        )
        .force("charge", d3.forceManyBody().strength(-10))
        .force(
          "collide",
          d3.forceCollide((n) => n.r + 2).strength(0.1),
        )
        // Keep the repo nodes want to stay close to the contributor node
        // so they try to spread out evenly around it
        .force("x", d3.forceX().x(d.fx).strength(0.1))
        .force("y", d3.forceY().y(d.fy).strength(0.1));

      simulation.nodes(nodes_to_contributor).stop();

      simulation.force("link").links(links_contributor);

      //Manually "tick" through the network
      let n_ticks = 200;
      for (let i = 0; i < n_ticks; ++i) {
        simulation.tick();
        //Ramp up collision strength to provide smooth transition
        simulation.force("collide").strength(Math.pow(i / n_ticks, 2) * 0.8);
      } //for i

      // Determine the farthest distance of the nodes (including its radius) to the contributor node
      d.max_radius = d3.max(nodes_to_contributor, (n) =>
        sqrt((n.x - d.x) ** 2 + (n.y - d.y) ** 2),
      );
      // Determine which node is the largest distance to the contributor node
      let max_radius_node = nodes_to_contributor.find(
        (n) => sqrt((n.x - d.x) ** 2 + (n.y - d.y) ** 2) === d.max_radius,
      );
      // Get the overall radius to take into account for the next simulation and labeling
      d.max_radius = max(d.max_radius + (max_radius_node ? max_radius_node.r : 0), d.r);
      // See this as the new "contributor node" radius that includes all of it's single-degree repos
      if (typeof localStorage !== 'undefined' && localStorage.getItem('debug-contributor-network') === 'true') {
        console.log(`Contributor ${d.id}: max_radius = ${d.max_radius}`);
      }
    }); // forEach
} // function runContributorSimulation
