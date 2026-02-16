/**
 * Force simulation for community (non-sponsored) contributors
 *
 * Positions community contributor nodes in a scattered band outside the
 * main sponsored contributor ring. Uses d3.forceRadial to push nodes
 * outward while d3.forceCollide prevents overlap.
 *
 * @module simulations/communitySimulation
 */

/**
 * Run force simulation for community contributor nodes
 *
 * Positions community contributors outside the sponsored contributor ring
 * in a scattered, organic layout. Nodes are pushed to a radial band
 * centered at RADIUS_CONTRIBUTOR * 1.5 with slight randomness.
 *
 * @param {Array} nodes - All nodes in the visualization
 * @param {Array} links - All links between nodes
 * @param {Object} d3 - D3 library reference
 * @param {Function} getLinkNodeId - Helper to extract node ID from link source/target
 * @param {number} RADIUS_CONTRIBUTOR - Radius of the sponsored contributor ring
 */
export function runCommunitySimulation(nodes, links, d3, getLinkNodeId, RADIUS_CONTRIBUTOR) {
  // Filter to only community contributor nodes
  const communityNodes = nodes.filter(
    (d) => d.type === 'contributor' && d.tier === 'community'
  );

  if (communityNodes.length === 0) return;

  // Community contributors are placed in a band outside the main ring
  const communityRadius = RADIUS_CONTRIBUTOR * 1.45;
  const radiusSpread = RADIUS_CONTRIBUTOR * 0.3;

  // Give each community node a starting position scattered around the band
  communityNodes.forEach((d, i) => {
    const angle = (i / communityNodes.length) * Math.PI * 2;
    const jitter = (Math.random() - 0.5) * radiusSpread;
    d.x = Math.cos(angle) * (communityRadius + jitter);
    d.y = Math.sin(angle) * (communityRadius + jitter);
  });

  // Build links that connect community contributors to repos/owners in the visualization
  const communityIds = new Set(communityNodes.map((d) => d.id));
  const communityLinks = links.filter(
    (l) => communityIds.has(getLinkNodeId(l.source))
  );

  // Find the repo/owner nodes connected to community contributors
  const connectedTargetIds = new Set(
    communityLinks.map((l) => getLinkNodeId(l.target))
  );
  const connectedTargets = nodes.filter((d) => connectedTargetIds.has(d.id));

  // The simulation includes community nodes + their connected repos
  // (repos are fixed from previous simulations so they act as anchors)
  const simNodes = [...communityNodes, ...connectedTargets];

  // Build simplified link data for the simulation
  const simLinks = communityLinks.map((l) => ({
    source: getLinkNodeId(l.source),
    target: getLinkNodeId(l.target),
  }));

  // Define the simulation
  const simulation = d3
    .forceSimulation()
    .nodes(simNodes)
    .force(
      'link',
      d3
        .forceLink()
        .id((d) => d.id)
        .distance(communityRadius * 0.3)
        .strength(0.05)
    )
    .force(
      'radial',
      d3.forceRadial(communityRadius, 0, 0).strength(0.4)
    )
    .force(
      'collide',
      d3.forceCollide((d) => (d.r || 10) + 4).strength(0.6)
    )
    .force(
      'charge',
      d3.forceManyBody().strength(-20)
    )
    .stop();

  simulation.force('link').links(simLinks);

  // Manually tick through the simulation
  const nTicks = 200;
  for (let i = 0; i < nTicks; ++i) {
    simulation.tick();
    // Ramp up collision strength smoothly
    simulation.force('collide').strength(Math.pow(i / nTicks, 2) * 0.8);
  }

  // Fix the community node positions so they don't move during subsequent interactions
  // Also mark as central so they get labels and are included in hover detection
  communityNodes.forEach((d) => {
    d.fx = d.x;
    d.fy = d.y;
    d.node_central = true;
  });
}
