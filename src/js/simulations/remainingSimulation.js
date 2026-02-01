/**
 * Force simulation for contributors outside the main circle
 * 
 * Runs a force simulation to position remaining contributors (those not in the main ORCA ring)
 * outside the outer NON-ORCA ring.
 * 
 * @module simulations/remainingSimulation
 */

/**
 * Run force simulation for remaining contributors
 * 
 * @param {Array} remainingContributors - Array of contributor nodes outside the main ring
 * @param {Object} d3 - D3 library reference
 * @param {number} TAU - 2 * PI constant
 * @param {Function} cos - Math.cos function
 * @param {Function} sin - Math.sin function
 * @param {Function} max - Math.max function
 * @param {number} RADIUS_CONTRIBUTOR - Radius for contributor positioning
 * @param {number} RADIUS_CONTRIBUTOR_NON_ORCA - Radius for non-ORCA contributors
 * @param {number} ORCA_RING_WIDTH - Width of the ORCA ring
 * @param {number} DEFAULT_SIZE - Default canvas size
 * @param {Function} scale_remaining_contributor_radius - Scale function for remaining contributor radius
 */
export function runRemainingSimulation(
  remainingContributors,
  d3,
  TAU,
  cos,
  sin,
  max,
  RADIUS_CONTRIBUTOR,
  RADIUS_CONTRIBUTOR_NON_ORCA,
  ORCA_RING_WIDTH,
  DEFAULT_SIZE,
  scale_remaining_contributor_radius
) {
  let LW = ((RADIUS_CONTRIBUTOR * 2.3) / 2 - RADIUS_CONTRIBUTOR) * 2;
  let R = RADIUS_CONTRIBUTOR_NON_ORCA + LW * 2;

  // Initial random position, but outside of the ORCA ring
  remainingContributors.forEach((d) => {
    let angle = Math.random() * TAU;
    d.x = (R + Math.random() * 50) * cos(angle);
    d.y = (R + Math.random() * 50) * sin(angle);

    d.r = scale_remaining_contributor_radius(d.commit_count);
  }); // forEach

  let simulation = d3
    .forceSimulation()
    .force(
      "collide",
      d3
        .forceCollide()
        .radius((d) => d.r + Math.random() * 20 + 10)
        .strength(1),
    )
    // .force("charge",
    //     d3.forceManyBody()
    // )
    .force("x", d3.forceX().x(0).strength(0.01)) //0.1
    .force("y", d3.forceY().y(0).strength(0.01)); //0.1

  // Add a dummy node to the dataset that is fixed in the center that is as big as the NON-ORCA circle
  remainingContributors.push({
    x: 0,
    y: 0,
    fx: 0,
    fy: 0,
    r: RADIUS_CONTRIBUTOR_NON_ORCA + LW * 0.75,
    id: "dummy",
  });

  // Perform the simulation
  simulation.nodes(remainingContributors).stop();

  // Manually "tick" through the network
  let n_ticks = 30;
  for (let i = 0; i < n_ticks; ++i) {
    simulation.tick();
    // Make sure that the nodes remain within the canvas
    // simulationPlacementConstraints(remainingContributors)
  } //for i

  // Remove the dummy node from the dataset again
  remainingContributors.pop();

  /////////////////////////////////////////////////////////////
  function simulationPlacementConstraints(nodes) {
    let OUTER_AREA = max(
      DEFAULT_SIZE / 2,
      RADIUS_CONTRIBUTOR_NON_ORCA + (ORCA_RING_WIDTH / 2) * 2,
    );
    let O = 30;
    // Make sure the nodes remain within the canvas
    nodes.forEach((d) => {
      if (d.x < -OUTER_AREA + d.r)
        d.x = -OUTER_AREA + d.r * 2 + Math.random() * O;
      else if (d.x > OUTER_AREA - d.r)
        d.x = OUTER_AREA - d.r * 2 + Math.random() * O;
      if (d.y < -OUTER_AREA + d.r)
        d.y = -OUTER_AREA + d.r * 2 + Math.random() * O;
      else if (d.y > OUTER_AREA - d.r)
        d.y = OUTER_AREA - d.r * 2 + Math.random() * O;
    }); // forEach
  } // simulationPlacementConstraints
} // function runRemainingSimulation
