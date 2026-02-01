// This file was copied-and-modified from
// https://github.com/nbremer/ORCA/blob/77745774d9d189818ab1ba27e07979897434abf9/top-contributor-network/createORCAVisual.js,
// and is licensed under the same (MPL).
//
// Development Seed Modifications:
// - Updated color scheme to DevSeed brand (Grenadier orange, Aquamarine blue)
// - Removed the central "team" pseudo-node from rendering (but kept for layout)
// - Added null safety checks for hover/click interactions
// - Added boundary checking to prevent hover outside visualization area
// - Added mouseleave handler to properly clean up hover state
// - Filtered out artificial links to/from the central pseudo-node
// - Refactored to use modular components (Phase 1 & 2 data expansion)
//
/////////////////////////////////////////////////////////////////////
/////////////// Visualization designed & developed by ///////////////
/////////////////////////// Nadieh Bremer ///////////////////////////
///////////////////////// VisualCinnamon.com ////////////////////////
/////////////////////////////////////////////////////////////////////

// ============================================================
// Modular Imports (loaded via Vite bundler)
import { COLORS, FONTS, SIZES, LAYOUT as THEME_LAYOUT } from './src/js/config/theme.js';
import {
  isValidNode,
  isValidLink,
  getLinkNodeId
} from './src/js/utils/validation.js';
import {
  createRepoRadiusScale,
  createContributorRadiusScale,
  createRemainingContributorRadiusScale,
  createLinkDistanceScale,
  createLinkWidthScale
} from './src/js/config/scales.js';
import {
  setFont,
  setRepoFont,
  setCentralRepoFont,
  setOwnerFont,
  setContributorFont,
  renderText,
  getLines,
  splitString,
  drawTextAlongArc
} from './src/js/render/text.js';

// ============================================================
import {
  renderStatsLine,
  renderLanguages,
  renderCommunityMetrics,
  renderLicense,
  renderArchivedBadge,
  REPO_CARD_CONFIG
} from './src/js/render/repoCard.js';
import {
  runOwnerSimulation,
  runContributorSimulation,
  runCollaborationSimulation,
  runRemainingSimulation
} from './src/js/simulations/index.js';
import {
  createFilterState,
  addOrganization,
  removeOrganization,
  clearFilters,
  hasOrganization,
  hasActiveFilters
} from './src/js/state/filterState.js';
import {
  createInteractionState,
  setHovered,
  clearHover,
  setClicked,
  clearClick,
  clearAll,
  setDelaunay,
  clearDelaunay
} from './src/js/state/interactionState.js';

// ============================================================
// Main Visualization
// ============================================================
const createORCAVisual = (
  container,
  initial_repo_central,
  contributor_padding,
  masterContributorsList,
  displayNameMap,
) => {
  /////////////////////////////////////////////////////////////////
  ///////////////////// CONSTANTS & VARIABLES /////////////////////
  /////////////////////////////////////////////////////////////////

  const PI = Math.PI;
  const TAU = PI * 2;

  let round = Math.round;
  let cos = Math.cos;
  let sin = Math.sin;
  let min = Math.min;
  let max = Math.max;
  let sqrt = Math.sqrt;

  // Default repo
  let REPO_CENTRAL = initial_repo_central;

  /////////////////////////////////////////////////////////////////
  // Filter State Management
  /////////////////////////////////////////////////////////////////
  // Extracted to src/js/state/filterState.js
  let activeFilters = createFilterState();

  // Master contributor list (passed from template)
  // Used for: validating contributors exist, future username-based filtering
  // - masterContributors: { username: { ...contributor data } }
  // - displayNameToUsername: { "Display Name": "github_username" }
  let masterContributors = masterContributorsList;
  let displayNameToUsername = displayNameMap;

  /**
   * Check if a contributor display name is in the master list
   * Useful for filtering to only "official" DeVSeed employees or verifying data integrity
   * @param {string} displayName - The display name to check
   * @returns {boolean} - True if valid or validation impossible, false if invalid
   */
  function isValidContributor(displayName) {
    // If maps are missing (e.g. during initial loads or legacy mode), default to true
    if (!displayNameToUsername || !masterContributors) return true;

    // Check if name maps to a username, and that username exists in master list
    const username = displayNameToUsername[displayName];
    return username && masterContributors[username];
  }

  // Preserve original data to allow filtering
  let originalContributors;
  let originalRepos;
  let originalLinks;

  // Track visible data after filtering
  let visibleRepos;
  let visibleLinks;
  let visibleContributors;

  // Datasets
  let contributors, remainingContributors, orcaRecipients;
  let repos;
  let nodes = [],
    nodes_central;
  let links;
  let central_repo;

  /////////////////////////////////////////////////////////////////
  // Interaction State Management
  /////////////////////////////////////////////////////////////////
  // Extracted to src/js/state/interactionState.js
  let interactionState = createInteractionState();
  
  // Convenience references to state properties (for easier migration)
  // These will be replaced with interactionState.* throughout the code
  let delaunay = interactionState.delaunay;
  let nodes_delaunay = interactionState.nodesDelaunay;
  let delaunay_remaining = interactionState.delaunayRemaining;

  // Visual Settings - Based on SF = 1
  const CENTRAL_RADIUS = 35; // The radius of the central repository node (reduced for less prominence)
  let RADIUS_CONTRIBUTOR; // The eventual radius along which the contributor nodes are placed
  let RADIUS_CONTRIBUTOR_NON_ORCA; // The radius along which the contributor nodes are placed that have not received ORCA
  let ORCA_RING_WIDTH;

  const INNER_RADIUS_FACTOR = 0.7; // The factor of the RADIUS_CONTRIBUTOR outside of which the inner repos are not allowed to go in the force simulation
  const MAX_CONTRIBUTOR_WIDTH = 55; // The maximum width (at SF = 1) of the contributor name before it gets wrapped
  const CONTRIBUTOR_PADDING = contributor_padding; // The padding between the contributor nodes around the circle (at SF = 1)

  let REMAINING_PRESENT = false; // Is the dataset of remaining contributors present?
  let ORCA_PRESENT = false; // Is the dataset of ORCA recipients present?

  /////////////////////////////////////////////////////////////////
  ///////////////////////////// Colors ////////////////////////////
  /////////////////////////////////////////////////////////////////
  /* 
   * DevSeed Brand Colors
   * Imported from src/js/config/theme.js
   * Kept as local constants for compatibility
   */
  const COLOR_BACKGROUND = COLORS.background;

  // Was purple, now Grenadier for accent rings
  const COLOR_PURPLE = COLORS.grenadier;

  const COLOR_REPO_MAIN = COLORS.repoMain;       // Grenadier (signature orange)
  const COLOR_REPO = COLORS.repo;            // Aquamarine (secondary blue)
  const COLOR_OWNER = COLORS.owner;           // Grenadier
  const COLOR_CONTRIBUTOR = COLORS.contributor;     // Lighter aquamarine

  const COLOR_LINK = COLORS.link;
  const COLOR_TEXT = COLORS.text;            // Base dark gray

  /////////////////////////////////////////////////////////////////
  //////////////////////// Validation Helpers /////////////////////
  /////////////////////////////////////////////////////////////////
  // Imported from src/js/utils/validation.js
  // isValidNode, isValidLink, getLinkNodeId are now imported


  /////////////////////////////////////////////////////////////////
  ///////////////////////// Create Canvas /////////////////////////
  /////////////////////////////////////////////////////////////////

  // Create the three canvases and add them to the container
  const canvas = document.createElement("canvas");
  canvas.id = "canvas";
  const context = canvas.getContext("2d");

  const canvas_click = document.createElement("canvas");
  canvas_click.id = "canvas-click";
  const context_click = canvas_click.getContext("2d");

  const canvas_hover = document.createElement("canvas");
  canvas_hover.id = "canvas-hover";
  const context_hover = canvas_hover.getContext("2d");

  container.appendChild(canvas);
  container.appendChild(canvas_click);
  container.appendChild(canvas_hover);

  // Set some important stylings of each canvas
  container.style.position = "relative";
  container.style["background-color"] = COLOR_BACKGROUND;

  styleCanvas(canvas);
  styleCanvas(canvas_hover);
  styleCanvas(canvas_click);

  styleBackgroundCanvas(canvas);
  styleBackgroundCanvas(canvas_click);

  canvas_hover.style.position = "absolute";
  canvas_hover.style.top = "0";
  canvas_hover.style.left = "0";
  canvas_hover.style.zIndex = "2";

  function styleCanvas(canvas) {
    canvas.style.display = "block";
    canvas.style.margin = "0";
  } // function styleCanvas

  function styleBackgroundCanvas(canvas) {
    canvas.style.position = "absolute";
    canvas.style.top = "0";
    canvas.style.left = "0";
    canvas.style.pointerEvents = "none";
    canvas.style.zIndex = "0";
    canvas.style.transition = "opacity 200ms ease-in";
  } // function styleBackgroundCanvas

  /////////////////////////////////////////////////////////////////
  /////////////////////////// Set Sizes ///////////////////////////
  /////////////////////////////////////////////////////////////////

  //Sizes
  const DEFAULT_SIZE = 1500;
  let WIDTH = DEFAULT_SIZE;
  let HEIGHT = DEFAULT_SIZE;
  let width = DEFAULT_SIZE;
  let height = DEFAULT_SIZE;
  let SF, PIXEL_RATIO;

  /////////////////////////////////////////////////////////////////
  //////////////////////// Create Functions ///////////////////////
  /////////////////////////////////////////////////////////////////

  let parseDate = d3.timeParse("%Y-%m-%dT%H:%M:%SZ");
  let parseDateUnix = d3.timeParse("%s");
  let formatDate = d3.timeFormat("%b %Y");
  let formatDateExact = d3.timeFormat("%b %d, %Y");
  let formatDigit = d3.format(",.2s");
  // let formatDigit = d3.format(",.2r")

  /* D3 Scales - using factories from src/js/config/scales.js */
  const scale_repo_radius = createRepoRadiusScale(d3);

  // Based on the number of commits to the central repo
  const scale_contributor_radius = createContributorRadiusScale(d3);
  const scale_remaining_contributor_radius = createRemainingContributorRadiusScale(d3);

  const scale_link_distance = createLinkDistanceScale(d3);

  const scale_link_width = createLinkWidthScale(d3);
  // .clamp(true)

  /////////////////////////////////////////////////////////////////
  //////////////////////// Draw the Visual ////////////////////////
  /////////////////////////////////////////////////////////////////

  function chart(values) {
    /////////////////////////////////////////////////////////////
    ////////////////////// Data Preparation /////////////////////
    /////////////////////////////////////////////////////////////
    // Preserve original data for filtering
    originalContributors = JSON.parse(JSON.stringify(values[0]));
    originalRepos = JSON.parse(JSON.stringify(values[1]));
    originalLinks = JSON.parse(JSON.stringify(values[2]));

    // Initialize filters to show all
    applyFilters();

    // contributors, repos, links are now set by applyFilters
    if (values[3]) {
      // Check if there is a column called "author_name" in the dataset
      if (values[3][0].author_name !== undefined) {
        remainingContributors = values[3];
        REMAINING_PRESENT = true;
        if (values[4]) {
          orcaRecipients = values[4];
          ORCA_PRESENT = true;
        } // if
        // Otherwise check if there is a column called "name", because then this is the ORCA recipient dataset
      } else if (values[3][0].name !== undefined) {
        orcaRecipients = values[3];
        ORCA_PRESENT = true;
      } // else if
    } // if
    prepareData();
    // console.log("Data prepared")

    /////////////////////////////////////////////////////////////
    /////////////// Run Force Simulation per Owner //////////////
    /////////////////////////////////////////////////////////////
    // Run a force simulation for per owner for all the repos that have the same "owner"
    // Like a little cloud of repos around them
    runOwnerSimulation(nodes, links, d3, getLinkNodeId, sqrt, max, min);
    // console.log("Contributor mini force simulation done")

    /////////////////////////////////////////////////////////////
    //////////// Run Force Simulation per Contributor ///////////
    /////////////////////////////////////////////////////////////
    // Run a force simulation for per contributor for all the repos that are not shared between other contributors
    // Like a little cloud of repos around them
    runContributorSimulation(nodes, links, d3, getLinkNodeId, sqrt, max);
    // console.log("Owner mini force simulation done")

    /////////////////////////////////////////////////////////////
    ///////////////// Position Contributor Nodes ////////////////
    /////////////////////////////////////////////////////////////
    // Place the central repo in the middle
    central_repo.x = central_repo.fx = 0;
    central_repo.y = central_repo.fy = 0;

    // Place the contributor nodes in a circle around the central repo
    // Taking into account the max_radius of single-degree repos around them
    positionContributorNodes();
    // console.log("Contributor nodes positioned")

    /////////////////////////////////////////////////////////////
    /////////// Run Force Simulation for Shared Repos ///////////
    /////////////////////////////////////////////////////////////
    // Run a force simulation to position the repos that are shared between contributors
    nodes_central = runCollaborationSimulation(
      nodes,
      links,
      d3,
      getLinkNodeId,
      sqrt,
      max,
      context,
      REPO_CENTRAL,
      central_repo,
      scale_link_distance,
      RADIUS_CONTRIBUTOR,
      INNER_RADIUS_FACTOR
    );
    // console.log("Central force simulation done")

    /////////////////////////////////////////////////////////////
    ////// Run Force Simulation for Remaining Contributors //////
    /////////////////////////////////////////////////////////////
    // Run a force simulation to position the remaining contributors around the central area
    if (REMAINING_PRESENT) {
      runRemainingSimulation(
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
      );
    }
    // console.log("Remaining contributor force simulation done")

    /////////////////////////////////////////////////////////////
    ////////////// Resolve String References in Links ///////////
    /////////////////////////////////////////////////////////////
    // After all force simulations, ensure ALL links have source/target
    // as node objects (not string IDs). Some links may not pass through
    // any simulation, leaving their references as strings.
    resolveLinkReferences();

    /////////////////////////////////////////////////////////////
    ////////////////////// Setup the Hover //////////////////////
    /////////////////////////////////////////////////////////////
    setupHover();
    setupClick();

    /////////////////////////////////////////////////////////////
    ///////////// Set the Sizes and Draw the Visual /////////////
    /////////////////////////////////////////////////////////////
    chart.resize();
  } // function chart

  /////////////////////////////////////////////////////////////////
  //////////////////////// Draw the visual ////////////////////////
  /////////////////////////////////////////////////////////////////

  function draw() {
    /////////////////////////////////////////////////////////////
    // Fill the background with a color
    context.fillStyle = COLOR_BACKGROUND;
    context.fillRect(0, 0, WIDTH, HEIGHT);

    // Move the visual to the center
    context.save();
    context.translate(WIDTH / 2, HEIGHT / 2);

    /////////////////////////////////////////////////////////////
    // Draw the remaining contributors as small circles outside the ORCA circles
    if (REMAINING_PRESENT) {
      context.fillStyle = COLOR_CONTRIBUTOR;
      context.globalAlpha = 0.4;
      remainingContributors.forEach((d) => {
        drawCircle(context, d.x, d.y, SF, d.r);
      }); // forEach
      context.globalAlpha = 1;
    } // if

    /////////////////////////////////////////////////////////////
    // Draw two rings that show the placement of the ORCA receiving contributors versus the non-ORCA receiving contributors
    drawBigRings(context, SF);

    /////////////////////////////////////////////////////////////
    // Draw all the links as lines (skip links to/from the central pseudo-node)
    // Also validate that nodes exist and are positioned to prevent rendering errors
    links.forEach((l) => {
      // Skip drawing links that connect directly to the central "team" node
      // These are artificial links that don't represent real contributions
      const targetId = l.target.id || l.target;
      const sourceId = l.source.id || l.source;
      if (targetId === REPO_CENTRAL || sourceId === REPO_CENTRAL) return;

      // Validate that both nodes exist and have finite coordinates
      if (
        l.source && l.target &&
        typeof l.source.x === 'number' && typeof l.source.y === 'number' &&
        typeof l.target.x === 'number' && typeof l.target.y === 'number' &&
        isFinite(l.source.x) && isFinite(l.source.y) &&
        isFinite(l.target.x) && isFinite(l.target.y)
      ) {
        drawLink(context, SF, l);
      }
    });

    /////////////////////////////////////////////////////////////
    // Draw all the nodes as circles (skip the central pseudo-node)
    nodes.forEach((d) => {
      if (d.id === REPO_CENTRAL) return; // Skip central pseudo-node
      drawNodeArc(context, SF, d);
    });
    nodes.forEach((d) => {
      if (d.id === REPO_CENTRAL) return; // Skip central pseudo-node
      drawNode(context, SF, d);
    });

    /////////////////////////////////////////////////////////////
    // Draw the labels (skip central pseudo-node)
    nodes_central.forEach((d) => {
      if (d.id === REPO_CENTRAL) return;
      drawNodeLabel(context, d);
    });

    // Test to see how the bbox of the nodes look
    // drawBbox(context, nodes)

    /////////////////////////////////////////////////////////////
    context.restore();
  } // function draw

  /////////////////////////////////////////////////////////////////
  //////////////////////// Resize the chart ///////////////////////
  /////////////////////////////////////////////////////////////////
  chart.resize = () => {
    // Screen pixel ratio
    PIXEL_RATIO = Math.max(2, window.devicePixelRatio);

    // It's the width that determines the size
    WIDTH = round(width * PIXEL_RATIO);
    HEIGHT = round(height * PIXEL_RATIO);

    sizeCanvas(canvas, context);
    sizeCanvas(canvas_click, context_click);
    sizeCanvas(canvas_hover, context_hover);

    // Size the canvas
    function sizeCanvas(canvas, context) {
      canvas.width = WIDTH;
      canvas.height = HEIGHT;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${HEIGHT / PIXEL_RATIO}px`;

      // Some canvas settings
      context.lineJoin = "round";
      context.lineCap = "round";
    } // function sizeCanvas

    // Set the scale factor
    SF = WIDTH / DEFAULT_SIZE;
    // If this means that the ring won't fit, make the SF smaller
    let OUTER_RING = RADIUS_CONTRIBUTOR_NON_ORCA + (ORCA_RING_WIDTH / 2) * 2;
    if (WIDTH / 2 < OUTER_RING * SF) SF = WIDTH / (2 * OUTER_RING);
    // console.log("SF:", SF)

    // Reset the delaunay for the mouse events
    nodes_delaunay = nodes;
    delaunay = d3.Delaunay.from(nodes_delaunay.map((d) => [d.x, d.y]));
    if (REMAINING_PRESENT)
      delaunay_remaining = d3.Delaunay.from(
        remainingContributors.map((d) => [d.x, d.y]),
      );
    // Update interaction state with Delaunay data
    setDelaunay(interactionState, delaunay, nodes_delaunay, delaunay_remaining);
    // // Test to see if the delaunay works
    // testDelaunay(delaunay, context_hover)

    // Draw the visual
    draw();
  }; //function resize

  /////////////////////////////////////////////////////////////////
  /////////////////// Data Preparation Functions //////////////////
  /////////////////////////////////////////////////////////////////

  //////////////// Apply filters to the data ////////////////
  // NOTE: Pure filter logic has been extracted to src/js/data/filter.js
  // This function handles integration with the visualization's mutable state.
  // For new features (e.g., blog charts), import { applyFilters } from './src/js/data/filter.js'
  // See ARCHITECTURE_RECOMMENDATIONS.md for migration guide.
  function applyFilters() {
    // Guard against uninitialized data
    if (!originalRepos || !originalLinks || !originalContributors) {
      console.error("applyFilters(): Original data not initialized");
      return;
    }

    // Start with pristine DEEP COPY of all repos (not shallow .slice())
    // Critical: prepareData() mutates objects (adds/deletes properties),
    // so we must clone to avoid corrupting originalRepos on subsequent rebuilds
    visibleRepos = JSON.parse(JSON.stringify(originalRepos));

    // If organizations are selected, filter to those organizations
    if (hasActiveFilters(activeFilters)) {
      visibleRepos = visibleRepos.filter((repo) => {
        // Always include the central pseudo-repo
        if (repo.repo === REPO_CENTRAL) return true;
        const owner = repo.repo.substring(0, repo.repo.indexOf("/"));
        return hasOrganization(activeFilters, owner);
      });
    }

    // Get visible repo names for quick lookup
    const visibleRepoNames = new Set(visibleRepos.map((r) => r.repo));

    // Filter links to DEEP COPY (filter first, then clone)
    // Links are also mutated in prepareData() (source/target set, author_name deleted)
    visibleLinks = originalLinks
      .filter((link) => visibleRepoNames.has(link.repo))
      .map((link) => JSON.parse(JSON.stringify(link)));

    // Build set of visible contributor display names from visible links
    const visibleDisplayNames = new Set(
      visibleLinks.map((link) => link.author_name),
    );

    // Filter contributors to DEEP COPY
    // Contributors are mutated in prepareData() (contributor_name_top deleted, etc.)
    visibleContributors = originalContributors
      .filter((contributor) => visibleDisplayNames.has(contributor.author_name))
      .map((c) => JSON.parse(JSON.stringify(c)));

    // Build set of visible contributor names for link filtering
    const visibleContributorNames = new Set(
      visibleContributors.map((c) => c.author_name),
    );

    // Re-filter links to only those where the contributor is also visible
    visibleLinks = visibleLinks.filter((link) => {
      return visibleContributorNames.has(link.author_name);
    });

    // Update the working arrays that prepareData() uses
    contributors = visibleContributors;
    repos = visibleRepos;
    links = visibleLinks;

    // Debug: Log filtering results (enable via localStorage)
    if (localStorage.getItem('debug-orca') === 'true') {
      console.debug('=== APPLY FILTERS ===');
      console.debug(`Filters applied: ${activeFilters.organizations.join(", ") || "none"}`);
      console.debug(`Data before: ${originalContributors.length} contributors, ${originalRepos.length} repos, ${originalLinks.length} links`);
      console.debug(`Data after: ${visibleContributors.length} contributors, ${visibleRepos.length} repos, ${visibleLinks.length} links`);
      console.debug('Visible repos:', visibleRepos.map(r => r.repo));
      console.debug('Visible contributors:', visibleContributors.map(c => c.author_name));
    }
  }

  //////////////// Prepare the data for the visual ////////////////
  function prepareData() {
    /////////////////////////////////////////////////////////////
    ///////////////////// Initial Data Prep /////////////////////
    /////////////////////////////////////////////////////////////

    ////////////////////////// CONTRIBUTORS /////////////////////////
    contributors.forEach((d) => {
      d.contributor_name = d.author_name;

      // If the ORCA dataset is present, check if this contributor is in it
      if (ORCA_PRESENT)
        d.orca_received = orcaRecipients.find((o) => o.name === d.author_name)
          ? true
          : false;
      else d.orca_received = false;

      d.color = COLOR_CONTRIBUTOR;

      // Determine across how many lines to split the contributor name
      setContributorFont(context);
      [d.contributor_lines, d.contributor_max_width] = getLines(
        context,
        d.contributor_name,
        MAX_CONTRIBUTOR_WIDTH,
      );

      delete d.contributor_name_top;
    }); // forEach

    //////////////////////// REPOSITORIES ///////////////////////
    repos.forEach((d) => {
      // d.repo
      d.forks = +d.repo_forks;
      d.stars = +d.repo_stars;
      // Phase 1: Additional metadata
      d.watchers = +d.repo_watchers || 0;
      d.openIssues = +d.repo_open_issues || 0;
      d.license = d.repo_license || null;
      d.topics = d.repo_topics ? d.repo_topics.split(",").filter(t => t !== "") : [];
      d.hasDiscussions = d.repo_has_discussions === "true" || d.repo_has_discussions === true;
      d.archived = d.repo_archived === "true" || d.repo_archived === true;
      // Phase 2: Community metrics
      d.totalContributors = +d.repo_total_contributors || 0;
      d.devseedContributors = +d.repo_devseed_contributors || 0;
      d.externalContributors = +d.repo_external_contributors || 0;
      d.communityRatio = +d.repo_community_ratio || 0;

      // Check if the dates are in unix time or not
      if (isInteger(d.createdAt)) {
        d.createdAt = parseDateUnix(d.createdAt);
        d.updatedAt = parseDateUnix(d.repo_updatedAt);
      } else {
        d.createdAt = parseDate(d.repo_createdAt);
        d.updatedAt = parseDate(d.repo_updatedAt);
      } // else

      // Get the substring until the slash
      d.owner = d.repo.substring(0, d.repo.indexOf("/"));
      // Get the substring after the slash
      d.name = d.repo.substring(d.repo.indexOf("/") + 1);

      // d.repo = d.owner

      // Split the string of languages into an array
      d.languages = d.repo_languages.split(",");
      // Remove languages that are empty or ""
      d.languages = d.languages.filter((l) => l !== "" && l !== " ");

      d.color = COLOR_REPO;

      delete d.repo_forks;
      delete d.repo_stars;
      delete d.repo_watchers;
      delete d.repo_open_issues;
      delete d.repo_license;
      delete d.repo_topics;
      delete d.repo_has_discussions;
      delete d.repo_archived;
      delete d.repo_total_contributors;
      delete d.repo_devseed_contributors;
      delete d.repo_external_contributors;
      delete d.repo_community_ratio;
      delete d.repo_createdAt;
      delete d.repo_updatedAt;
    }); // forEach

    /////////////////////////// LINKS ///////////////////////////
    links.forEach((d) => {
      // Source
      d.contributor_name = d.author_name;
      // Target
      // d.repo

      // Metadata of the "link"
      d.commit_count = +d.commit_count;

      // Check if the dates are in unix time or not
      if (isInteger(d.commit_sec_min)) {
        d.commit_sec_min = parseDateUnix(d.commit_sec_min);
        d.commit_sec_max = parseDateUnix(d.commit_sec_max);
      } else {
        d.commit_sec_min = parseDate(d.commit_sec_min);
        d.commit_sec_max = parseDate(d.commit_sec_max);
      } // else

      // Get the substring until the slash
      d.owner = d.repo.substring(0, d.repo.indexOf("/"));
      // Get the substring after the slash
      d.name = d.repo.substring(d.repo.indexOf("/") + 1);

      // d.repo = d.owner

      // Set-up initial source and target
      d.source = d.contributor_name;
      d.target = d.repo;

      delete d.author_name;
    }); // forEach

    ///////////////////// OTHER CONTRIBUTORS ////////////////////
    if (REMAINING_PRESENT) {
      remainingContributors.forEach((d) => {
        d.commit_count = +d.commit_count;

        // Check if the dates are in unix time or not
        if (isInteger(d.commit_sec_min)) {
          d.commit_sec_min = parseDateUnix(d.commit_sec_min);
          d.commit_sec_max = parseDateUnix(d.commit_sec_max);
        } else {
          d.commit_sec_min = parseDate(d.commit_sec_min);
          d.commit_sec_max = parseDate(d.commit_sec_max);
        } // else

        d.type = "contributor";
        d.remaining_contributor = true;
        d.color = COLOR_CONTRIBUTOR;
      }); // forEach
    } // if

    //////////////////////// Create Nodes ///////////////////////
    // Combine the contributors and repos into one variable to become the nodes
    contributors.forEach((d, i) => {
      nodes.push({
        id: d.contributor_name,
        type: "contributor",
        label: d.contributor_name,
        data: d,
      });
    }); // forEach
    repos.forEach((d, i) => {
      nodes.push({
        id: d.repo,
        type: "repo",
        label: d.name,
        data: d,
      });
    }); // forEach

    // Save all the original links
    // Note: Use getLinkNodeId() for consistency - handles both string and object refs
    contributors.forEach((d) => {
      d.links_original = links.filter((l) => getLinkNodeId(l.source) === d.contributor_name);
      // To which repositories did this contributor contribute
      d.repos = d.links_original.map((l) =>
        repos.find((r) => r.repo === l.repo),
      );
    }); // forEach
    repos.forEach((d) => {
      d.links_original = links.filter((l) => getLinkNodeId(l.target) === d.repo);
      // Who contributed to this repository (filter out undefined for contributors not in the visualization)
      d.contributors = d.links_original
        .map((l) => contributors.find((r) => r.contributor_name === l.contributor_name))
        .filter((c) => c !== undefined);
    }); // forEach

    /////////////////////////////////////////////////////////////
    // Mark all the repositories that have a link to at least one contributor that has received ORCA
    repos.forEach((d) => {
      d.orca_impacted = false;
      d.links_original.forEach((l) => {
        if (
          contributors.find(
            (c) =>
              c.contributor_name === l.contributor_name &&
              c.orca_received === true,
          )
        ) {
          d.orca_impacted = true;
        } // if
      }); // forEach
    }); // forEach

    /////////////////////////////////////////////////////////////
    // Which is the central repo, the one that connects everyone (the one with the highest degree)
    central_repo = nodes.find(
      (d) => d.type === "repo" && d.id === REPO_CENTRAL,
    );

    /////////////////////////// OWNERS //////////////////////////
    // Create a dataset for all the repos that have an owner that occurs more than once
    let owners = nodes
      .filter(
        (d) =>
          d.type === "repo" &&
          nodes.filter(
            (n) =>
              n.id !== d.id &&
              n.type === "repo" &&
              n.data.owner === d.data.owner,
          ).length > 1,
      )
      .map((d) => d.data);

    // Create a unique entry per owner
    owners = d3.group(owners, (d) => d.owner);
    owners = Array.from(owners, ([key, value]) => ({
      owner: key,
      repos: value.map((n) => n.name),
      color: COLOR_OWNER,
      stars: d3.sum(value, (d) => d.stars),
      forks: d3.sum(value, (d) => d.forks),
    }));

    // Sort by the owner name
    owners.sort((a, b) => {
      if (a.owner.toLowerCase() < b.owner.toLowerCase()) return -1;
      else if (a.owner.toLowerCase() > b.owner.toLowerCase()) return 1;
      else return 0;
    }); // sort

    // Validate owners have repos (prevents positioning issues during filtering)
    // After filtering, some owners might have no visible repos left
    const beforeOwnerCount = owners.length;
    owners = owners.filter(owner => {
      const ownerRepos = nodes.filter(n => n.type === 'repo' && n.data.owner === owner.owner);
      if (ownerRepos.length === 0) {
        debugWarn(`Filtering out owner with no repos: ${owner.owner}`);
        return false;
      }
      return true;
    });
    if (localStorage.getItem('debug-orca') === 'true' && beforeOwnerCount !== owners.length) {
      console.debug(`Removed ${beforeOwnerCount - owners.length} owners with no repos`);
    }

    // Debug logging (enable via: localStorage.setItem('debug-orca', 'true'))
    if (localStorage.getItem('debug-orca') === 'true') {
      console.log("Owners:", owners);
      console.log("Contributors:", contributors);
    }

    // Check which of the repos are owned by those in the "owners" dataset
    nodes
      .filter((d) => d.type === "repo")
      .forEach((d) => {
        d.data.multi_repo_owner = owners.find((o) => o.owner === d.data.owner)
          ? true
          : false;
      }); // forEach

    // Add the owners to the nodes dataset
    owners.forEach((d, i) => {
      nodes.push({
        id: d.owner,
        type: "owner",
        label: d.owner,
        data: d,
      });
    }); // forEach

    /////////////////////////////////////////////////////////////
    // Redo Links to take owners into account as a grouping node

    // Also for the links where the target is also in the owner dataset replace the link to the owner and make a new link from the owner to the repo
    let new_links_owner_repo = [];
    let new_links_contributor_owner = [];
    links.forEach((d) => {
      // If the target's owner is also in the owners dataset, replace the link to the owner and make a new link from the owner to the repo
      // Except if the target is the central repo
      if (d.repo !== REPO_CENTRAL && owners.find((o) => o.owner === d.owner)) {
        // Add a new link from the owner to the repo
        new_links_owner_repo.push({
          source: d.owner,
          target: d.repo,
          owner: d.owner,
          // name: d.name,
          // repo: d.repo,

          commit_count: d.commit_count,
          commit_sec_min: d.commit_sec_min,
          commit_sec_max: d.commit_sec_max,
        }); // push

        // Add a new link from the contributor to the owner
        new_links_contributor_owner.push({
          source: d.contributor_name,
          target: d.owner,
          owner: d.owner,

          commit_count: d.commit_count,
          commit_sec_min: d.commit_sec_min,
          commit_sec_max: d.commit_sec_max,
        }); // push

        // delete d.commit_count
        // delete d.commit_sec_min
        // delete d.commit_sec_max

        // Delete this link
        d.to_remove = true;
      }
    }); // forEach
    links = links.filter((d) => !(d.to_remove === true));

    /////////////////////////////////////////////////////////////
    // Get the unique set of new_links

    // Group all the new_links_contributor_owner by their source and target and add the commit counts, and take the min and max of the commit_sec_min and commit_sec_max
    // new_links_contributor_owner = Array.from(new Set(new_links_contributor_owner.map(d => JSON.stringify(d)))).map(d => JSON.parse(d))
    new_links_contributor_owner = d3.group(
      new_links_contributor_owner,
      (d) => d.source + "~" + d.target,
    );
    new_links_contributor_owner = Array.from(
      new_links_contributor_owner,
      ([key, value]) => {
        let [source, target] = key.split("~");
        return {
          source: source,
          target: target,
          owner: value[0].owner,
          commit_count: d3.sum(value, (d) => d.commit_count),
          commit_sec_min: d3.min(value, (d) => d.commit_sec_min),
          commit_sec_max: d3.max(value, (d) => d.commit_sec_max),
        };
      },
    ); // map

    // new_links_owner_repo = Array.from(new Set(new_links_owner_repo.map(d => JSON.stringify(d)))).map(d => JSON.parse(d))
    new_links_owner_repo = d3.group(
      new_links_owner_repo,
      (d) => d.source + "~" + d.target,
    );
    new_links_owner_repo = Array.from(new_links_owner_repo, ([key, value]) => {
      let [source, target] = key.split("~");
      return {
        source: source,
        target: target,
        owner: value[0].owner,
        commit_count: d3.sum(value, (d) => d.commit_count),
        commit_sec_min: d3.min(value, (d) => d.commit_sec_min),
        commit_sec_max: d3.max(value, (d) => d.commit_sec_max),
      };
    }); // map

    // Set-up the new links dataset
    links = [...links, ...new_links_owner_repo, ...new_links_contributor_owner];

    // Filter out links with empty or invalid source/target IDs
    // These can occur if contributor names or owner names are empty strings
    links = links.filter(link => {
      // Check for empty strings or missing values
      if (!link.source || typeof link.source !== 'string' || link.source.trim() === '') {
        if (localStorage.getItem('debug-orca') === 'true') {
          console.warn(`Filtered link with empty source: → "${link.target}"`);
        }
        return false;
      }
      if (!link.target || typeof link.target !== 'string' || link.target.trim() === '') {
        if (localStorage.getItem('debug-orca') === 'true') {
          console.warn(`Filtered link with empty target: "${link.source}" →`);
        }
        return false;
      }
      return true;
    });

    // Validate all links reference nodes that exist (fixes filtering crash)
    // This prevents "non-finite" gradient errors when filtered links reference missing nodes
    const nodeIds = new Set(nodes.map(n => n.id));
    links = links.filter(link => {
      const sourceExists = nodeIds.has(link.source);
      const targetExists = nodeIds.has(link.target);
      if (!sourceExists || !targetExists) {
        if (localStorage.getItem('debug-orca') === 'true') {
          console.warn(`Filtered invalid link: "${link.source}" → "${link.target}"`, {
            sourceNodeExists: sourceExists,
            targetNodeExists: targetExists
          });
        }
        return false;
      }
      return true;
    });

    // Add a link between the owner of the central repo and the central repo
    // Only add if owner is not empty (prevent empty string source)
    if (central_repo.data.owner && central_repo.data.owner.trim() !== '') {
      links.push({
        source: central_repo.data.owner,
        target: central_repo.id,
        owner: central_repo.data.owner,
        commit_count: d3.sum(
          links.filter((l) => getLinkNodeId(l.target) === central_repo.id),
          (d) => d.commit_count,
        ),
        commit_sec_min: d3.min(
          links.filter((l) => getLinkNodeId(l.target) === central_repo.id),
          (d) => d.commit_sec_min,
        ),
        commit_sec_max: d3.max(
          links.filter((l) => getLinkNodeId(l.target) === central_repo.id),
          (d) => d.commit_sec_max,
        ),
      });
    }

    // Debug logging (enable via: localStorage.setItem('debug-orca', 'true'))
    if (localStorage.getItem('debug-orca') === 'true') {
      console.log("Links:", links);
    }

    /////////////////////////////////////////////////////////////
    // Which of these owner types have links that are all to the same contributor node
    // If so, mark them as "single-contributor"
    owners.forEach((d) => {
      // Get all the links that are connected to this owner, where the owner is the target (and the source is a contributor)
      let links_owner = links.filter((l) => getLinkNodeId(l.target) === d.owner);
      // If the length is 1, it means that this owner is only connected to one contributor
      d.single_contributor = links_owner.length === 1 ? true : false;

      // Get all the repos that are connected to this owner
      d.repos = nodes
        .filter((n) => n.type === "repo" && n.data.owner === d.owner)
        .map((n) => n.data);
    }); // forEach

    /////////////////////////////////////////////////////////////
    // Set scales with guards against empty filtered data
    const repoStars = repos.map((d) => d.stars);
    if (repoStars.length > 0) {
      scale_repo_radius.domain(d3.extent(repoStars));
    } else {
      scale_repo_radius.domain([0, 10]); // fallback for empty dataset
    }

    const linksToCentral = links.filter((l) => getLinkNodeId(l.target) === central_repo.id);
    if (linksToCentral.length > 0) {
      scale_contributor_radius.domain(
        d3.extent(linksToCentral, (d) => d.commit_count),
      );
    } else {
      scale_contributor_radius.domain([1, 10]); // fallback for empty dataset
    }

    if (links.length > 0) {
      scale_link_width.domain([1, 10, d3.max(links, (d) => d.commit_count)]);
    } else {
      scale_link_width.domain([1, 10, 60]); // fallback
    }

    scale_remaining_contributor_radius.domain([
      0,
      scale_contributor_radius.domain()[0],
    ]);

    /////////////////////////////////////////////////////////////
    // Determine some visual settings for the nodes
    nodes.forEach((d, i) => {
      d.index = i;
      d.data.index = i;

      // Find the degree of each node
      d.degree = links.filter(
        (l) => getLinkNodeId(l.source) === d.id || getLinkNodeId(l.target) === d.id,
      ).length;
      // d.in_degree = links.filter(l => l.target === d.id).length
      // d.out_degree = links.filter(l => l.source === d.id).length

      // Get all the connected nodes
      // Takes too long, done on hover
      // d.neighbors = nodes.filter(n => links.find(l => l.source === d.id && l.target === n.id || l.target === d.id && l.source === n.id))

      // TEST - set initial placement
      d.x = 0;
      d.y = 0;

      // If this node is an "contributor", find the number of commits they have on the central repo node
      if (d.type === "contributor") {
        let link_to_central = links.find(
          (l) => getLinkNodeId(l.source) === d.id && getLinkNodeId(l.target) === central_repo.id,
        );
        d.data.link_central = link_to_central;
        // d.data.commit_count_central = link_to_central.commit_count
        d.r = scale_contributor_radius(d.data.link_central.commit_count);
      } else if (d.type === "repo") {
        d.r = scale_repo_radius(d.data.stars);
      } else {
        // "owner"
        d.r = scale_repo_radius(d.data.stars);
      } // else

      d.color = d.data.color;
    }); // forEach

    // Sort the nodes by their type and for the contributor nodes, by their min commit date to the central repo
    nodes.sort((a, b) => {
      if (a.type === b.type) {
        // if(a.id.toLowerCase() < b.id.toLowerCase()) return -1
        // else if(a.id.toLowerCase() > b.id.toLowerCase()) return 1
        if (a.data.link_central && b.data.link_central) {
          if (
            a.data.link_central.commit_sec_min <
            b.data.link_central.commit_sec_min
          )
            return -1;
          else if (
            a.data.link_central.commit_sec_min >
            b.data.link_central.commit_sec_min
          )
            return 1;
          else return 0;
        } else return 0;
      } else {
        if (a.type < b.type) return -1;
        else if (a.type > b.type) return 1;
        else return 0;
      } // else
    }); // sort

    // Replace some values for the central repository
    central_repo.r = CENTRAL_RADIUS;
    central_repo.padding = CENTRAL_RADIUS;
    central_repo.special_type = "central";
    central_repo.color = COLOR_REPO_MAIN;
  } // function prepareData

  /////////////////////////////////////////////////////////////////
  ///////////////// Force Simulation | Per Owner //////////////////
  /////////////////////////////////////////////////////////////////
  // Extracted to src/js/simulations/ownerSimulation.js

  /////////////////////////////////////////////////////////////////
  /////////////// Force Simulation | Per Contributor //////////////
  /////////////////////////////////////////////////////////////////
  // Extracted to src/js/simulations/contributorSimulation.js

  // Place the contributor nodes in a circle around the central repo
  // Taking into account the max_radius of single-degree repos around them
  function positionContributorNodes() {
    // Ensure all contributors have a valid max_radius before calculating ring size
    const contributorNodes = nodes.filter((d) => d.type === "contributor");
    contributorNodes.forEach((d) => {
      // Ensure max_radius is set - fallback to contributor's own radius
      if (!d.max_radius || !isFinite(d.max_radius) || d.max_radius <= 0) {
        d.max_radius = d.r || 20; // Minimum fallback radius
      }
      // Ensure connected_single_repo array exists
      if (!d.connected_single_repo) {
        d.connected_single_repo = [];
      }
    });

    // Get the sum of all the contributor nodes' max_radius
    let sum_radius = contributorNodes
      .reduce((acc, curr) => acc + curr.max_radius * 2, 0);
    // Take padding into account between the contributor nodes
    sum_radius += contributors.length * CONTRIBUTOR_PADDING;
    // This sum should be the circumference of the circle around the central node, what radius belongs to this -> 2*pi*R
    RADIUS_CONTRIBUTOR = sum_radius / TAU;

    // Ensure minimum radius so contributors don't collapse to center
    // Use a larger minimum that scales with the number of contributors
    const MIN_RADIUS = Math.max(200, contributorNodes.length * 15);
    let useEvenSpacing = false;
    if (!isFinite(RADIUS_CONTRIBUTOR) || RADIUS_CONTRIBUTOR < MIN_RADIUS) {
      console.warn(`RADIUS_CONTRIBUTOR too small (${RADIUS_CONTRIBUTOR}), using minimum ${MIN_RADIUS}`);
      RADIUS_CONTRIBUTOR = MIN_RADIUS;
      useEvenSpacing = true; // When using minimum, distribute evenly
    }

    RADIUS_CONTRIBUTOR_NON_ORCA = RADIUS_CONTRIBUTOR * (ORCA_PRESENT ? 1.3 : 1);
    ORCA_RING_WIDTH = ((RADIUS_CONTRIBUTOR * 2.3) / 2 - RADIUS_CONTRIBUTOR) * 2; // Not too sure about this in how well it holds up for other data

    // Calculate even angle increment for when we need to override spacing
    const evenAngleIncrement = TAU / contributorNodes.length;

    // Always log positioning info for debugging
    console.log(`positionContributorNodes: ${contributorNodes.length} contributors, sum_radius=${sum_radius}, RADIUS_CONTRIBUTOR=${RADIUS_CONTRIBUTOR}, useEvenSpacing=${useEvenSpacing}`);

    // Fix the contributor nodes in a ring around the central node
    // const angle = TAU / (nodes.filter(d => d.type === "contributor").length)
    let angle = 0;
    contributorNodes.forEach((d, i) => {
      // Subtract the contributor node position from all it's connected single-degree repos
      // (this converts their positions from absolute to relative to the contributor)
      if (d.connected_single_repo && d.connected_single_repo.length > 0) {
        d.connected_single_repo.forEach((repo) => {
          repo.x -= d.x;
          repo.y -= d.y;
        }); // forEach
      }

      // Find the new position of the contributor node in a ring around the central node
      // max_radius should already be set from the validation above

      // Debug: log first few contributor positions
      if (i < 3) {
        console.log(`Contributor ${i} "${d.id}": max_radius=${d.max_radius}, r=${d.r}, central_repo=(${central_repo.fx}, ${central_repo.fy})`);
      }

      let contributor_arc = d.max_radius * 2 + CONTRIBUTOR_PADDING;
      // translate this distance to an angle
      let contributor_angle;
      if (useEvenSpacing) {
        // When using minimum radius, distribute evenly around the circle
        contributor_angle = evenAngleIncrement / 2;
      } else {
        contributor_angle = contributor_arc / RADIUS_CONTRIBUTOR / 2;
      }

      let radius_drawn = d.data.orca_received
        ? RADIUS_CONTRIBUTOR
        : RADIUS_CONTRIBUTOR_NON_ORCA;
      d.x =
        central_repo.fx +
        radius_drawn * cos(angle + contributor_angle - PI / 2);
      d.y =
        central_repo.fy +
        radius_drawn * sin(angle + contributor_angle - PI / 2);
      d.contributor_angle = angle + contributor_angle - PI / 2;
      angle += useEvenSpacing ? evenAngleIncrement : contributor_angle * 2;

      // Fix the contributors for the force simulation
      d.fx = d.x;
      d.fy = d.y;

      // Add the new contributor position to all it's connected single-degree repos
      // (converting their positions back from relative to absolute)
      if (d.connected_single_repo && d.connected_single_repo.length > 0) {
        d.connected_single_repo.forEach((repo) => {
          repo.x += d.x;
          repo.y += d.y;

          // Fix position for force simulation
          repo.fx = repo.x;
          repo.fy = repo.y;
        }); // forEach
      }
    }); // forEach
  } // function positionContributorNodes

  /////////////////////////////////////////////////////////////////
  ///////////// Force Simulation | Collaboration Repos ////////////
  /////////////////////////////////////////////////////////////////
  // Extracted to src/js/simulations/collaborationSimulation.js

  /////////////////////////////////////////////////////////////////
  ///////////// Force Simulation | Other Contributors /////////////
  /////////////////////////////////////////////////////////////////
  // Extracted to src/js/simulations/remainingSimulation.js

  /////////////////////////////////////////////////////////////////
  ////////////////////// Background Elements //////////////////////
  /////////////////////////////////////////////////////////////////
  // Draw two rings around the central node to show those that receive ORCA (if present) vs the other top contributors
  /////////////////////////////////////////////////////////////////
  ////////////////////// Background Elements //////////////////////
  /////////////////////////////////////////////////////////////////
  // Draw two rings around the central node to show those that receive ORCA (if present) vs the other top contributors
  function drawBigRings(context, SF) {
    // Draw the ORCA rings
    context.fillStyle = context.strokeStyle = COLOR_PURPLE; //COLOR_REPO_MAIN //spectral.mix("#e3e3e3", COLOR_REPO_MAIN, 0.75)
    let LW = ORCA_RING_WIDTH;
    let O = 4;
    context.lineWidth = 1.5 * SF;
    // context.lineWidth = LW * SF

    if (ORCA_PRESENT) {
      // Inner ring of those receiving ORCA
      context.beginPath();
      context.moveTo(0 + (RADIUS_CONTRIBUTOR + LW / 2 - O) * SF, 0);
      context.arc(0, 0, (RADIUS_CONTRIBUTOR + LW / 2 - O) * SF, 0, TAU);
      context.moveTo(0 + (RADIUS_CONTRIBUTOR - LW / 2) * SF, 0);
      context.arc(0, 0, (RADIUS_CONTRIBUTOR - LW / 2) * SF, 0, TAU, true);
      context.globalAlpha = 0.06;
      context.fill();
      context.globalAlpha = 0.2;
      // context.stroke()
    } // if

    // Second ring of those not receiving ORCA
    context.beginPath();
    context.moveTo(0 + (RADIUS_CONTRIBUTOR_NON_ORCA + LW / 2) * SF, 0);
    context.arc(0, 0, (RADIUS_CONTRIBUTOR_NON_ORCA + LW / 2) * SF, 0, TAU);
    context.moveTo(0 + (RADIUS_CONTRIBUTOR_NON_ORCA - LW / 2 + O) * SF, 0);
    context.arc(
      0,
      0,
      (RADIUS_CONTRIBUTOR_NON_ORCA - LW / 2 + O) * SF,
      0,
      TAU,
      true,
    );
    context.globalAlpha = ORCA_PRESENT ? 0.03 : 0.05;
    context.fill();
    context.globalAlpha = 0.1;
    // context.stroke()

    // Add the title along the two bands
    if (ORCA_PRESENT) {
      context.textAlign = "center";
      setFont(context, 16 * SF, 700, "italic");
      context.globalAlpha = 0.5;
      context.textBaseline = "bottom";
      drawTextAlongArc(
        context,
        "contributors supported through ORCA",
        TAU * 0.9,
        (RADIUS_CONTRIBUTOR - (LW / 2 - O - 2)) * SF,
        "up",
        1.5 * SF,
      );

      context.textBaseline = "top";
      drawTextAlongArc(
        context,
        `other top contributors`,
        TAU * 0.9,
        (RADIUS_CONTRIBUTOR_NON_ORCA + (LW / 2 - O - 2)) * SF,
        "up",
        1.5 * SF,
      );
    } // if
    context.globalAlpha = 1;
  } // function drawBigRings

  /////////////////////////////////////////////////////////////////
  ///////////////////// Node Drawing Functions ////////////////////
  /////////////////////////////////////////////////////////////////

  function drawNode(context, SF, d) {
    // Is this a node that is a repo that is not impacted by ORCA?
    let REPO_NOT_ORCA = d.type === "repo" && !d.data.orca_impacted;
    // The central "team" node should be subtle/muted since it's not a real repo
    const IS_CENTRAL = d.id === REPO_CENTRAL;
    if (IS_CENTRAL) REPO_NOT_ORCA = false;

    // Draw a circle for the node
    context.shadowBlur = interactionState.hoverActive ? 0 : max(2, d.r * 0.2) * SF;
    context.shadowColor = "#f7f7f7";

    // Central node gets reduced opacity to be less prominent
    context.globalAlpha = IS_CENTRAL ? 0.5 : (REPO_NOT_ORCA ? 0.4 : 1);
    context.fillStyle = d.color;
    drawCircle(context, d.x, d.y, SF, d.r);
    context.globalAlpha = 1;
    context.shadowBlur = 0;

    // Draw a small circle in the center for the not ORCA impacted repos
    if (REPO_NOT_ORCA) drawCircle(context, d.x, d.y, SF, d.r * 0.3);

    // Also draw a stroke around the node
    if (!d.remaining_contributor) {
      context.strokeStyle = COLOR_BACKGROUND;
      context.lineWidth = max(interactionState.hoverActive ? 1.5 : 1, d.r * 0.07) * SF;
      drawCircle(context, d.x, d.y, SF, d.r, true, true);
      context.stroke();
    } // if
  } // function drawNode

  function drawNodeArc(context, SF, d) {
    // Draw an arc around the repository node that shows how long the contributor has been active in that repo for all its existence, based on the first and last commit time
    if (
      interactionState.hoverActive &&
      interactionState.hoveredNode &&
      interactionState.hoveredNode.type === "contributor" &&
      d.type === "repo"
    ) {
      let link = interactionState.hoveredNode.data.links_original.find((p) => p.repo === d.id);
      // Only draw arc if link exists
      if (link) timeRangeArc(context, SF, d, d, link, COLOR_CONTRIBUTOR);
    } // if
  } // function drawNodeArc

  //////////////////////// Draw Hover Ring ////////////////////////
  // Draw a stroked ring around the hovered node
  function drawHoverRing(context, d) {
    let r = d.r + (d.type === "contributor" ? 9 : d === central_repo ? 14 : 7);
    context.beginPath();
    context.moveTo((d.x + r) * SF, d.y * SF);
    context.arc(d.x * SF, d.y * SF, r * SF, 0, TAU);
    context.strokeStyle = d.color;
    context.lineWidth = 3 * SF;
    context.stroke();
  } // function drawHoverRing

  /////////////////////// Arc around Circle ///////////////////////
  // Draw a tiny arc around the node to show how long they've been involved in a certain repo's existence, based on their first and last commit
  function timeRangeArc(context, SF, d, repo, link, COL = COLOR_REPO_MAIN) {
    context.save();
    context.translate(d.x * SF, d.y * SF);

    context.fillStyle = COL;
    context.strokeStyle = COL;

    // The scale for between which min and max date the contributor has been involved in the central repo
    const scale_involved_range = d3
      .scaleLinear()
      .domain([repo.data.createdAt, repo.data.updatedAt])
      .range([0, TAU]);

    let r_inner =
      d.r + (d.type === "contributor" || d === central_repo ? 2.5 : 1);
    let r_outer = r_inner + 3;

    const arc = d3
      .arc()
      .innerRadius(r_inner * SF)
      .outerRadius(r_outer * SF)
      .startAngle(scale_involved_range(link.commit_sec_min))
      .endAngle(scale_involved_range(link.commit_sec_max))
      .context(context);

    // Create the arc
    context.beginPath();
    arc();
    context.fill();

    // // Draw a tiny marker at the top to show where the "start" is
    // context.beginPath()
    // context.moveTo(0, - (d.r + 2) * SF)
    // context.lineTo(0, - (d.r + 2 + 5) * SF)
    // context.lineWidth = 1 * SF
    // context.stroke()

    context.restore();
  } // function timeRangeArc

  ////////// Fill a circle with a diagonal hatch pattern //////////
  function drawHatchPattern(context, radius, angle) {
    context.save();
    context.beginPath();
    context.arc(0, 0, radius, 0, TAU);
    context.clip();

    const lW = 1.5 * SF;
    // const lW = min(0.3 * radius, 2.5)
    const step = 4 * lW * sin(angle / 2);

    context.lineWidth = lW;
    context.strokeStyle = d.color;
    for (let x = -2.5 * radius; x < 2.5 * radius; x += step) {
      context.beginPath();
      context.moveTo(x, -radius);
      context.lineTo(x + radius * Math.tan(angle / 2), radius);
      context.stroke();
    } // for x
    context.restore();
  } // function drawHatchPattern

  ///////////////////////// Draw a circle /////////////////////////
  function drawCircle(context, x, y, SF, r = 10, begin = true, stroke = false) {
    if (begin === true) context.beginPath();
    context.moveTo((x + r) * SF, y * SF);
    context.arc(x * SF, y * SF, r * SF, 0, TAU);
    if (begin && stroke == false) context.fill();
    // if(begin) { context.lineWidth = 1.5 * SF; context.stroke() }
  } //function drawCircle

  /////////////////////////////////////////////////////////////////
  ///////////////////// Line Drawing Functions ////////////////////
  /////////////////////////////////////////////////////////////////

  ////////// Draw the link between the source and target //////////
  function drawLink(context, SF, l) {
    // Guard: only draw links with valid, positioned nodes
    if (
      !l.source || !l.target ||
      typeof l.source.x !== 'number' || typeof l.target.x !== 'number' ||
      !isFinite(l.source.x) || !isFinite(l.source.y) ||
      !isFinite(l.target.x) || !isFinite(l.target.y)
    ) {
      return; // Skip this link - prevents rendering errors
    }

    if (l.source.x !== undefined && l.target.x !== undefined) {
      calculateLinkGradient(context, l);
      calculateEdgeCenters(l, 1);
      // Use gradient if available, fall back to solid color
      context.strokeStyle = l.gradient || COLOR_LINK;
    } else context.strokeStyle = COLOR_LINK;

    // Base line width
    let line_width = scale_link_width(l.commit_count);

    // If a hover is active, and the hovered node is a contributor, and this is a link between an owner and repository, make the line width depend on the commit_count of the original link between the contributor and the repository
    if (
      interactionState.hoverActive &&
      interactionState.hoveredNode &&
      interactionState.hoveredNode.type === "contributor" &&
      interactionState.hoveredNode.data &&
      interactionState.hoveredNode.data.links_original &&
      l.source.type === "owner" &&
      l.target.type === "repo"
    ) {
      // Find the link between this contributor and the repository in the links_original
      let link_original = interactionState.hoveredNode.data.links_original.find(
        (p) => p.repo === l.target.id,
      );
      // Base the line width on this commit count
      if (link_original)
        line_width = scale_link_width(link_original.commit_count);
    } // if

    context.lineWidth = line_width * SF;
    drawLine(context, SF, l);
  } // function drawLink

  ///////////////////////// Draw the lines ////////////////////////
  function drawLine(context, SF, line) {
    context.beginPath();
    context.moveTo(line.source.x * SF, line.source.y * SF);
    if (line.center) drawCircleArc(context, SF, line);
    else context.lineTo(line.target.x * SF, line.target.y * SF);
    context.stroke();
  } //function drawLine

  ////////////////////// Draw a curved line ///////////////////////
  function drawCircleArc(context, SF, line) {
    // Guard against missing arc center (can happen if arc radius is impossible)
    if (!line.center) {
      // Fallback to straight line
      context.lineTo(line.target.x * SF, line.target.y * SF);
      return;
    }

    let center = line.center;
    let ang1 = Math.atan2(
      line.source.y * SF - center.y * SF,
      line.source.x * SF - center.x * SF,
    );
    let ang2 = Math.atan2(
      line.target.y * SF - center.y * SF,
      line.target.x * SF - center.x * SF,
    );
    context.arc(
      center.x * SF,
      center.y * SF,
      line.r * SF,
      ang1,
      ang2,
      line.sign,
    );
  } //function drawCircleArc

  ///////////////////// Calculate Line Centers ////////////////////
  function calculateEdgeCenters(l, size = 2, sign = true) {
    //Find a good radius
    l.r =
      sqrt(sq(l.target.x - l.source.x) + sq(l.target.y - l.source.y)) * size; //Can run from > 0.5
    //Find center of the arc function
    let centers = findCenters(
      l.r,
      { x: l.source.x, y: l.source.y },
      { x: l.target.x, y: l.target.y },
    );
    l.sign = sign;
    l.center = l.sign ? centers.c2 : centers.c1;

    /////////////// Calculate center for curved edges ///////////////
    //https://stackoverflow.com/questions/26030023
    //http://jsbin.com/jutidigepeta/3/edit?html,js,output
    function findCenters(r, p1, p2) {
      // pm is middle point of (p1, p2)
      let pm = { x: 0.5 * (p1.x + p2.x), y: 0.5 * (p1.y + p2.y) };
      // compute leading vector of the perpendicular to p1 p2 == C1C2 line
      let perpABdx = -(p2.y - p1.y);
      let perpABdy = p2.x - p1.x;
      // normalize vector
      let norm = sqrt(sq(perpABdx) + sq(perpABdy));
      perpABdx /= norm;
      perpABdy /= norm;
      // compute distance from pm to p1
      let dpmp1 = sqrt(sq(pm.x - p1.x) + sq(pm.y - p1.y));
      // sin of the angle between { circle center,  middle , p1 }
      let sin = dpmp1 / r;
      // is such a circle possible ?
      if (sin < -1 || sin > 1) return null; // no, return null
      // yes, compute the two centers
      let cos = sqrt(1 - sq(sin)); // build cos out of sin
      let d = r * cos;
      let res1 = { x: pm.x + perpABdx * d, y: pm.y + perpABdy * d };
      let res2 = { x: pm.x - perpABdx * d, y: pm.y - perpABdy * d };
      return { c1: res1, c2: res2 };
    } //function findCenters
  } //function calculateEdgeCenters

  ///////////////// Create gradients for the links ////////////////
  function calculateLinkGradient(context, l) {
    // l.gradient = context.createLinearGradient(l.source.x, l.source.y, l.target.x, l.target.y)
    // l.gradient.addColorStop(0, l.source.color)
    // l.gradient.addColorStop(1, l.target.color)

    // The opacity of the links depends on the number of links
    const scale_alpha = d3
      .scaleLinear()
      .domain([300, 800])
      .range([0.5, 0.2])
      .clamp(true);

    // Incorporate opacity into gradient
    let alpha;
    if (interactionState.hoverActive) alpha = l.target.special_type ? 0.3 : 0.7;
    else alpha = l.target.special_type ? 0.15 : scale_alpha(links.length);
    createGradient(l, alpha);

    function createGradient(l, alpha) {
      let col;
      let color_rgb_source;
      let color_rgb_target;

      col = d3.rgb(l.source.color);
      color_rgb_source =
        "rgba(" + col.r + "," + col.g + "," + col.b + "," + alpha + ")";
      col = d3.rgb(l.target.color);
      color_rgb_target =
        "rgba(" + col.r + "," + col.g + "," + col.b + "," + alpha + ")";

      // Guard against non-finite coordinates (NaN, Infinity, -Infinity)
      // This prevents "createLinearGradient: non-finite" errors during filtering
      if (
        l.source && l.target &&
        typeof l.source.x === 'number' && typeof l.source.y === 'number' &&
        typeof l.target.x === 'number' && typeof l.target.y === 'number' &&
        isFinite(l.source.x) && isFinite(l.source.y) &&
        isFinite(l.target.x) && isFinite(l.target.y)
      ) {
        try {
          l.gradient = context.createLinearGradient(
            l.source.x * SF,
            l.source.y * SF,
            l.target.x * SF,
            l.target.y * SF,
          );

          // Distance between source and target
          let dist = sqrt(
            sq(l.target.x - l.source.x) + sq(l.target.y - l.source.y),
          );
          // What percentage is the source's radius of the total distance
          let perc = l.source.r / dist;
          // Let the starting color be at perc, so it starts changing color right outside the radius of the source node
          l.gradient.addColorStop(perc, color_rgb_source);
          l.gradient.addColorStop(1, color_rgb_target);
        } catch (e) {
          // If gradient creation fails for any reason, fall back to solid color
          if (localStorage.getItem('debug-orca') === 'true') {
            console.warn('Gradient creation error:', e, { link: l, sf: SF });
          }
          l.gradient = COLOR_LINK;
        }
      } else {
        // Gradient can't be created - invalid coordinates
        if (localStorage.getItem('debug-orca') === 'true') {
          console.warn('Invalid coordinates for gradient', {
            sourceX: l.source?.x,
            sourceY: l.source?.y,
            targetX: l.target?.x,
            targetY: l.target?.y
          });
        }
        l.gradient = COLOR_LINK;
      }
    } //function createGradient
  } //function calculateLinkGradient

  /////////////////////////////////////////////////////////////////
  //////////////////////// Hover Functions ////////////////////////
  /////////////////////////////////////////////////////////////////
  // Setup the hover on the top canvas, get the mouse position and call the drawing functions
  function setupHover() {
    d3.select("#canvas-hover").on("mousemove", function (event) {
      try {
        // Get the position of the mouse on the canvas
        let [mx, my] = d3.pointer(event, this);
        let [d, FOUND] = findNode(mx, my);

        // Draw the hover state on the top canvas
        // Skip hover on the central pseudo-node (it's not a real entity)
        if (FOUND && d && d.id !== REPO_CENTRAL) {
          setHovered(interactionState, d);

          // Fade out the main canvas, using CSS
          if (!d.remaining_contributor)
            canvas.style.opacity = d.type === "contributor" ? "0.15" : "0.3";

          // Draw the hovered node and its neighbors and links
          drawHoverState(context_hover, d);
        } else {
          context_hover.clearRect(0, 0, WIDTH, HEIGHT);
          clearHover(interactionState);

          if (!interactionState.clickActive) {
            // Fade the main canvas back in
            canvas.style.opacity = "1";
          } // if
        } // else
      } catch (err) {
        // Log error but don't break the handler
        console.warn("Hover error:", err);
        context_hover.clearRect(0, 0, WIDTH, HEIGHT);
        clearHover(interactionState);
        if (!interactionState.clickActive) canvas.style.opacity = "1";
      }
    }); // on mousemove

    // Clean up hover state when mouse leaves the canvas
    d3.select("#canvas-hover").on("mouseleave", function () {
      context_hover.clearRect(0, 0, WIDTH, HEIGHT);
      clearHover(interactionState);

      if (!interactionState.clickActive) {
        canvas.style.opacity = "1";
      }
    }); // on mouseleave
  } // function setupHover

  // Draw the hovered node and its links and neighbors and a tooltip
  function drawHoverState(context, d, DO_TOOLTIP = true) {
    // Draw the hover canvas
    context.save();
    context.clearRect(0, 0, WIDTH, HEIGHT);
    context.translate(WIDTH / 2, HEIGHT / 2);

    /////////////////////////////////////////////////
    // Get all the connected links (if not done before)
    if (d.neighbor_links === undefined) {
      d.neighbor_links = links.filter(
        (l) => {
          // Skip links to/from the central pseudo-node (not real contributions)
          const targetId = l.target.id || l.target;
          const sourceId = l.source.id || l.source;
          if (targetId === REPO_CENTRAL || sourceId === REPO_CENTRAL) return false;
          return l.source.id === d.id || l.target.id === d.id;
        }
      );
    } // if

    // Get all the connected nodes (if not done before)
    if (d.neighbors === undefined) {
      d.neighbors = nodes.filter((n) => {
        // Skip the central pseudo-node
        if (n.id === REPO_CENTRAL) return false;
        return links.find(
          (l) => {
            // Skip links to/from the central pseudo-node
            const targetId = l.target.id || l.target;
            const sourceId = l.source.id || l.source;
            if (targetId === REPO_CENTRAL || sourceId === REPO_CENTRAL) return false;
            return (l.source.id === d.id && l.target.id === n.id) ||
              (l.target.id === d.id && l.source.id === n.id);
          }
        );
      });

      // If any of these neighbors are "owner" nodes, find what the original repo was from that owner that the contributor was connected to
      // OR
      // If this node is a repo and any of these neighbors are "owner" nodes, find what original contributor was connected to this repo
      if (
        d.type === "contributor" ||
        (d.type === "repo" && d !== central_repo)
      ) {
        d.neighbors.forEach((n) => {
          if (n && n.type === "owner" && d.data && d.data.links_original) {
            // Go through all of the original links and see if this owner is in there
            d.data.links_original.forEach((l) => {
              if (l.owner === n.id) {
                let node, link;
                if (d.type === "contributor") {
                  // Find the repo node
                  node = nodes.find((r) => r.id === l.repo);
                  // Skip if node doesn't exist (repo not in visualization)
                  if (!node) return;
                  // Also find the link between the repo and owner and add this to the neighbor_links
                  link = links.find(
                    (l) => l.source.id === n.id && l.target.id === node.id,
                  );
                } else if (d.type === "repo") {
                  // Find the contributor node
                  node = nodes.find((r) => r.id === l.contributor_name);
                  // Skip if node doesn't exist (contributor not in visualization)
                  if (!node) return;
                  // Also find the link between the contributor and owner and add this to the neighbor_links
                  link = links.find(
                    (l) => l.source.id === node.id && l.target.id === n.id,
                  );
                } // else if

                // Add it to the neighbors (only if node exists)
                if (node) {
                  d.neighbors.push(node);
                  if (link) d.neighbor_links.push(link);
                }
              } // if
            }); // forEach
          } // if
        }); // forEach

        // Filter out the possible link between the central_node and its owner, to not create a ring
        d.neighbor_links = d.neighbor_links.filter(
          (l) =>
            !(
              l.target.id === central_repo.id &&
              l.source.id === central_repo.data.owner
            ),
        );
      } // if
    } // if

    /////////////////////////////////////////////////
    // Draw all the links to this node (with null safety)
    if (d.neighbor_links) {
      d.neighbor_links.forEach((l) => {
        if (l && l.source && l.target) drawLink(context, SF, l);
      }); // forEach
    }

    // Draw all the connected nodes (with null safety)
    if (d.neighbors) {
      d.neighbors.forEach((n) => { if (n) drawNodeArc(context, SF, n); });
      d.neighbors.forEach((n) => { if (n) drawNode(context, SF, n); });
      // Draw all the labels of the "central" connected nodes
      d.neighbors.forEach((n) => {
        if (n && n.node_central) drawNodeLabel(context, n);
      }); // forEach
    }

    /////////////////////////////////////////////////
    // Draw the hovered node
    drawNode(context, SF, d);
    // Show a ring around the hovered node
    drawHoverRing(context, d);

    /////////////////////////////////////////////////
    // Show its label
    if (d.node_central && d.type === "contributor") drawNodeLabel(context, d);

    /////////////////////////////////////////////////
    // Create a tooltip with more info
    if (DO_TOOLTIP) drawTooltip(context, d);

    context.restore();
  } // function drawHoverState

  /////////////////////////////////////////////////////////////////
  //////////////////////// Click Functions ////////////////////////
  /////////////////////////////////////////////////////////////////

  function setupClick() {
    d3.select("#canvas-hover").on("click", function (event) {
      // Get the position of the mouse on the canvas
      let [mx, my] = d3.pointer(event, this);
      let [d, FOUND] = findNode(mx, my);

      // Clear the "clicked" canvas
      context_click.clearRect(0, 0, WIDTH, HEIGHT);

      // Skip click on the central pseudo-node (it's not a real entity)
      if (FOUND && d && d.id !== REPO_CENTRAL) {
        setClicked(interactionState, d);

        // Reset the delaunay for the hover, taking only the neighbors into account of the clicked node
        nodes_delaunay = d.neighbors ? [...d.neighbors, d] : nodes;
        delaunay = d3.Delaunay.from(nodes_delaunay.map((n) => [n.x, n.y]));
        setDelaunay(interactionState, delaunay, nodes_delaunay, delaunay_remaining);

        // Copy the context_hovered to the context_click without the tooltip
        drawHoverState(context_click, d, false);
        // Empty the hovered canvas
        context_hover.clearRect(0, 0, WIDTH, HEIGHT);

        // // Test if the delaunay works
        // testDelaunay(delaunay, context_hover)
      } else {
        clearClick(interactionState);
        clearHover(interactionState);

        // Reset the delaunay to all the nodes
        nodes_delaunay = nodes;
        delaunay = d3.Delaunay.from(nodes_delaunay.map((d) => [d.x, d.y]));
        setDelaunay(interactionState, delaunay, nodes_delaunay, delaunay_remaining);

        // Fade the main canvas back in
        canvas.style.opacity = "1";
      } // else
    }); // on mousemove
  } // function setupHover

  /////////////////////////////////////////////////////////////////
  ///////////////// General Interaction Functions /////////////////
  /////////////////////////////////////////////////////////////////

  // Turn the mouse position into a canvas x and y location and see if it's close enough to a node
  function findNode(mx, my) {
    mx = (mx * PIXEL_RATIO - WIDTH / 2) / SF;
    my = (my * PIXEL_RATIO - HEIGHT / 2) / SF;

    // Check if mouse is within the visualization bounds (with some margin)
    const MAX_RADIUS = RADIUS_CONTRIBUTOR_NON_ORCA + ORCA_RING_WIDTH + 200;
    const distFromCenter = sqrt(mx * mx + my * my);
    if (distFromCenter > MAX_RADIUS) {
      return [null, false];
    }

    //Get the closest hovered node
    let point = delaunay.find(mx, my);
    let d = nodes_delaunay[point];

    // Safety check - if no node found, return early
    if (!d) {
      return [null, false];
    }

    // Get the distance from the mouse to the node
    let dist = sqrt((d.x - mx) ** 2 + (d.y - my) ** 2);
    // If the distance is too big, don't show anything
    let FOUND = dist < d.r + (interactionState.clickActive ? 10 : 50);

    // Check if the mouse is close enough to one of the remaining contributors of FOUND is false
    if (!FOUND && REMAINING_PRESENT) {
      point = delaunay_remaining.find(mx, my);
      d = remainingContributors[point];
      dist = sqrt((d.x - mx) ** 2 + (d.y - my) ** 2);
      FOUND = dist < d.r + 5;
    } // if

    return [d, FOUND];
  } // function findNode

  // Draw the tooltip above the node
  function drawTooltip(context, d) {
    let line_height = 1.2;
    let font_size;
    let text;

    // Figure out the base x and y position of the tooltip
    const x_base = d.x;
    const y_base =
      d.y + (d.y < 0 ? 1 : -1) * (d.max_radius ? d.max_radius : d.r);

    /////////////////////////////////////////////////////////////
    // Figure out the required height of the tooltip
    let H = 93;
    if (d.type === "contributor") {
      if (d.data && d.data.orca_received) H = 134;
      else H = 80;
    } else if (d.type === "repo") {
      if (d.id === central_repo.id) H = 80;
      else if (d.data.languages.length > 3) H = 222;
      else if (d.data.languages.length > 0) H = 210;
      else H = 169;

      if (interactionState.clickActive && interactionState.clickedNode && interactionState.clickedNode.type === "contributor") H += 63;
    } // else

    // Start with a minimum width
    let W = 280;

    // Write all the repos for the "owner" nodes, but make sure they are not wider than the box and save each line to write out
    if (d.type === "owner") {
      font_size = 11.5;
      setFont(context, font_size * SF, 400, "normal");
      d.text_lines = [];
      text = "";
      d.connected_node_cloud.forEach((repo, i) => {
        // Check the length of the new text to add
        let new_repo = `${repo.data.name}${i < d.connected_node_cloud.length - 1 ? ", " : ""
          }`;
        // If it's longer, push the current text to the array and start a new one
        if (
          context.measureText(`${text}${new_repo}`).width * 1.25 >
          0.85 * W * SF
        ) {
          d.text_lines.push(text);
          text = new_repo;
        } else {
          text += new_repo;
        } // else
      }); // forEach
      // Add the final possible bit
      if (text !== "") d.text_lines.push(text);
      // Update the height of the tooltip
      H += d.text_lines.length * (font_size * line_height);
    } // if

    /////////////////////////////////////////////////////////////////
    // Figure out the required width of the tooltip

    // Check if any of the typically longer texts are wider than this
    // Bit of a hack (if I change the font's settings later, I need to remember to do it here), but it works
    let tW = 0;
    if (d.type === "contributor") {
      // The contributor's name
      setFont(context, 15 * SF, 700, "normal");
      text = d.data ? d.data.contributor_name : d.author_name;
      tW = context.measureText(text).width * 1.25;
    } else if (d.type === "owner") {
      // The owner's name
      setFont(context, 15 * SF, 700, "normal");
      tW = context.measureText(d.data.owner).width * 1.25;
      // Check if any of the "repo lines" are longer than the owner's name
      setFont(context, 11.5 * SF, 400, "normal");
      d.text_lines.forEach((t) => {
        let line_width = context.measureText(t).width * 1.25;
        if (line_width > tW) tW = line_width;
      }); // forEach
    } else if (d.type === "repo") {
      // The repo's owner and name
      setFont(context, 14 * SF, 700, "normal");
      tW = context.measureText(d.data.owner).width * 1.25;
      if (context.measureText(d.data.name).width * 1.25 > tW)
        tW = context.measureText(d.data.name).width * 1.25;
      // Languages
      if (d.data.languages.length > 0) {
        setFont(context, 11.5 * SF, 400, "normal");
        let text = "";
        for (let i = 0; i < min(3, d.data.languages.length); i++) {
          text += `${d.data.languages[i]}${i < min(3, d.data.languages.length) - 1 ? ", " : ""
            }`;
        } // for i
        if (context.measureText(text).width * 1.25 > tW)
          tW = context.measureText(text).width * 1.24;
      } // if
    } // else
    // Update the max width if the text is wider
    if (tW + 40 * SF > W * SF) W = tW / SF + 40;

    /////////////////////////////////////////////////////////////////
    // If the hovered node is above half of the page, place the tooltip below the node
    let H_OFFSET = d.y < 0 ? 20 : -H - 20;
    context.save();
    context.translate(x_base * SF, (y_base + H_OFFSET) * SF);

    let x = 0;
    let y = 0;
    let COL;
    if (d.type === "contributor") COL = COLOR_CONTRIBUTOR;
    else if (d.type === "repo") COL = COLOR_REPO;
    else if (d.type === "owner") COL = COLOR_OWNER;

    // Background rectangle
    context.shadowBlur = 3 * SF;
    context.shadowColor = "#d4d4d4";
    context.fillStyle = COLOR_BACKGROUND;
    context.fillRect((x - W / 2) * SF, y * SF, W * SF, H * SF);
    context.shadowBlur = 0;

    // Line along the side
    context.fillStyle = COL;
    context.fillRect((x - W / 2 - 1) * SF, (y - 1) * SF, (W + 2) * SF, 6 * SF);

    // Textual settings
    context.textAlign = "center";
    context.textBaseline = "middle";

    // Contributor, owner or repo
    y = 20;
    font_size = 12;
    setFont(context, font_size * SF, 400, "italic");
    context.fillStyle = COL;
    text = "";
    if (d.id === central_repo.id) text = REPO_CENTRAL;
    else if (d.type === "contributor") text = "Contributor";
    else if (d.type === "repo") text = "Repository";
    else if (d.type === "owner") text = "Owner";
    renderText(context, text, x * SF, y * SF, 2.5 * SF);

    context.fillStyle = COLOR_TEXT;
    y += 24;

    if (d.id === central_repo.id) {
      font_size = 15;
      setFont(context, font_size * SF, 700, "normal");
      renderText(context, REPO_CENTRAL, x * SF, y * SF, 1.25 * SF);
    } else if (d.type === "contributor") {
      // The contributor's name
      font_size = 16;
      setFont(context, font_size * SF, 700, "normal");
      text = d.data ? d.data.contributor_name : d.author_name;
      renderText(context, text, x * SF, y * SF, 1.25 * SF);
    } else if (d.type === "owner") {
      // The name
      font_size = 16;
      setFont(context, font_size * SF, 700, "normal");
      renderText(context, d.data.owner, x * SF, y * SF, 1.25 * SF);

      // Which repos fall under this owner in this visual
      y += 28;
      font_size = 11;
      context.globalAlpha = 0.6;
      setFont(context, font_size * SF, 400, "italic");
      renderText(context, "Included repositories", x * SF, y * SF, 2 * SF);

      // Write out all the repositories
      font_size = 11.5;
      y += font_size * line_height + 4;
      context.globalAlpha = 0.9;
      setFont(context, font_size * SF, 400, "normal");
      d.text_lines.forEach((l, i) => {
        renderText(context, l, x * SF, y * SF, 1.25 * SF);
        y += font_size * line_height;
      }); // forEach
    } else if (d.type === "repo") {
      // The repo's name and owner
      font_size = 15;
      setFont(context, font_size * SF, 700, "normal");
      renderText(context, `${d.data.owner}/`, x * SF, y * SF, 1.25 * SF);
      renderText(
        context,
        d.data.name,
        x * SF,
        (y + line_height * font_size) * SF,
        1.25 * SF,
      );

      // The creation date
      y += 42;
      font_size = 11;
      context.globalAlpha = 0.7;
      setFont(context, font_size * SF, 400, "normal");
      renderText(
        context,
        `Created in ${formatDate(d.data.createdAt)}`,
        x * SF,
        y * SF,
        1.25 * SF,
      );
      // The most recent updated date
      y += font_size * line_height;
      renderText(
        context,
        `Last updated in ${formatDate(d.data.updatedAt)}`,
        x * SF,
        y * SF,
        1.25 * SF,
      );

      // ============================================================
      // Repo Card Sections (using modular components)
      // ============================================================

      // Stats line: stars, forks, watchers
      y += 23;
      renderStatsLine(context, d.data, x, y, SF, formatDigit);

      // Languages section
      y = renderLanguages(context, d.data, x, y, SF);

      // Community metrics section (Phase 2)
      y = renderCommunityMetrics(context, d.data, x, y, SF);

      // License (if available)
      y = renderLicense(context, d.data, x, y, SF);

      // Archived badge (if applicable)
      y = renderArchivedBadge(context, d.data, x, y, SF);

      // Number of ORCA recipients
      let ORCA_RECEIVED = 0;
      let weight = 400;
      context.globalAlpha = 0.8;
      font_size = 11;

      d.data.contributors.forEach((c) => {
        if (c.orca_received) ORCA_RECEIVED++;
      });
      y += 26;

      setFont(context, font_size * SF, weight, "normal");
      renderText(context, text, x * SF, y * SF, 1.25 * SF);
      context.fillStyle = COLOR_TEXT;
      context.globalAlpha = 0.9;

      // First and last commit the the hovered repo if a click is active
      if (interactionState.clickActive && interactionState.clickedNode && interactionState.clickedNode.type === "contributor") {
        // Get the first and last commit of the contributor to this repo
        let link = interactionState.clickedNode.data.links_original.find(
          (l) => l.repo === d.id,
        );
        // Skip if link doesn't exist (contributor not connected to this repo)
        if (!link) return;
        let num_commits = link.commit_count;

        y += 28;
        font_size = 11;
        context.globalAlpha = 0.6;
        setFont(context, font_size * SF, 400, "italic");
        text = num_commits === 1 ? "1 commit by" : `${num_commits} commits by`;
        renderText(context, text, x * SF, y * SF, 2 * SF);
        // renderText(context, "First and Last Commit by", x * SF, y * SF, 2 * SF)

        y += 16;
        font_size = 11.5;
        context.globalAlpha = 0.9;
        setFont(context, font_size * SF, 700, "normal");
        renderText(
          context,
          interactionState.clickedNode.data.contributor_name,
          x * SF,
          y * SF,
          1.25 * SF,
        );

        y += 18;
        font_size = 11;
        context.globalAlpha = 0.6;
        setFont(context, font_size * SF, 400, "normal");
        if (
          formatDateExact(link.commit_sec_min) ===
          formatDateExact(link.commit_sec_max)
        )
          text = `On ${formatDateExact(link.commit_sec_max)}`;
        else if (
          formatDate(link.commit_sec_min) === formatDate(link.commit_sec_max)
        )
          text = `In ${formatDate(link.commit_sec_max)}`;
        else
          text = `Between ${formatDate(link.commit_sec_min)} / ${formatDate(
            link.commit_sec_max,
          )}`;
        renderText(context, text, x * SF, y * SF, 1.25 * SF);
      } // if
    } // else

    context.restore();
  } // function drawTooltip

  /////////////////////////////////////////////////////////////////
  ///////////////////////// Text Functions ////////////////////////
  /////////////////////////////////////////////////////////////////

  function drawNodeLabel(context, d, DO_CENTRAL_OUTSIDE = false) {
    // Draw the name above each node
    context.fillStyle = COLOR_TEXT;
    context.lineWidth = 2 * SF;
    context.textAlign = "center";

    if (d.id === central_repo.id) {
      setCentralRepoFont(context, SF);
    } else if (d.type === "contributor") {
      setContributorFont(context, SF);
    } else if (d.type === "owner") {
      setOwnerFont(context, SF);
    } else {
      setRepoFont(context, SF);
    } // else

    if (d.type === "contributor") {
      context.textBaseline = "middle";

      // Draw the contributor name radiating outward from the contributor's node
      context.save();
      context.translate(d.x * SF, d.y * SF);
      context.rotate(
        d.contributor_angle + (d.contributor_angle > PI / 2 ? PI : 0),
      );
      // Move the max_radius farther away
      context.translate(
        (d.contributor_angle > PI / 2 ? -1 : 1) * (d.max_radius + 14) * SF,
        0,
      );
      // context.textAlign = "center"
      context.textAlign = d.contributor_angle > PI / 2 ? "right" : "left";

      let n = d.data.contributor_lines.length;
      let label_line_height = 1.2;
      let font_size = 13;
      d.data.contributor_lines.forEach((l, i) => {
        let x = 0;
        // Let the y-position be the center of the contributor node
        let y =
          (0 -
            ((n - 1) * font_size * label_line_height) / 2 +
            i * font_size * label_line_height) *
          SF;

        // Draw a background colored rectangle for those receiving ORCA
        if (d.data.orca_received) {
          let W = context.measureText(l).width * 1.25 + 8 * SF;
          let x_rect = x - 6 * SF;
          if (d.contributor_angle > PI / 2) x_rect = x + 4 * SF - W;
          context.fillStyle = "#CF3F0230";  // Grenadier at ~20% opacity
          context.fillRect(x_rect, -10 * SF + y, W, 20 * SF);
          context.globalAlpha = 1;
          context.fillStyle = COLOR_TEXT;
        } // if

        renderText(context, l, x, y, 1.25 * SF);
      }); // forEach

      context.restore();
    } else if (d.id === central_repo.id) {
      context.textBaseline = "middle";
      context.fillStyle = DO_CENTRAL_OUTSIDE
        ? COLOR_REPO_MAIN
        : COLOR_BACKGROUND;
      // If this is drawing the text in the inside of the central circle, clip it to that circle
      if (!DO_CENTRAL_OUTSIDE) {
        context.save();
        context.beginPath();
        context.arc(d.x * SF, d.y * SF, d.r * SF, 0, 2 * PI);
        context.clip();
      } // if
      if (d.data.owner)
        renderText(
          context,
          `${d.data.owner}/`,
          d.x * SF,
          (d.y - 0.6 * 12) * SF,
          1.25 * SF,
        );
      renderText(context, d.label, d.x * SF, (d.y + 0.9 * 12) * SF, 1.25 * SF);
      if (!DO_CENTRAL_OUTSIDE) context.restore();
    } else if (d.type === "repo") {
      context.textBaseline = "bottom";
      context.strokeStyle = COLOR_BACKGROUND;
      context.lineWidth = 4 * SF;
      renderText(
        context,
        `${d.data.owner}/`,
        d.x * SF,
        (d.y - d.r - 3 - 1.1 * 12) * SF,
        1.25 * SF,
        true,
      );
      renderText(
        context,
        d.label,
        d.x * SF,
        (d.y - d.r - 3) * SF,
        1.25 * SF,
        true,
      );
    } else {
      // owner
      context.textBaseline = "bottom";
      context.strokeStyle = COLOR_BACKGROUND;
      context.lineWidth = 4 * SF;
      renderText(
        context,
        `${d.label}/`,
        d.x * SF,
        (d.y - d.r - 3) * SF,
        1.25 * SF,
        true,
      );
    }
  } // function drawNodeLabel

  /////////////////////////////////////////////////////////////////////
  /////////////////////////// Font Functions //////////////////////////
  /////////////////////////////////////////////////////////////////////

  ////////////////////// Different Font Settings //////////////////////
  /* 
   * Text Functions - REFACTORED
   * These functions have been moved to src/js/render/text.js
   * and are now imported at the top of the file.
   */


  /////////////////////////////////////////////////////////////////
  ///////////////////////// Test Functions ////////////////////////
  /////////////////////////////////////////////////////////////////

  // TEST - Draw a (scaled wrong) version of the delaunay triangles
  function testDelaunay(delaunay, context) {
    context.save();
    context.translate(WIDTH / 2, HEIGHT / 2);
    context.beginPath();
    delaunay.render(context);
    context.strokeStyle = "silver";
    context.lineWidth = 1 * SF;
    context.stroke();
    context.restore();
  } // function testDelaunay

  // TEST - Draw a stroked rectangle around the bbox of the nodes
  function drawBbox(context, nodes) {
    context.strokeStyle = "red";
    context.lineWidth = 1;
    nodes
      .filter((d) => d.bbox)
      .forEach((d) => {
        context.strokeRect(
          d.x * SF + d.bbox[0][0] * SF,
          d.y * SF + d.bbox[0][1] * SF,
          (d.bbox[1][0] - d.bbox[0][0]) * SF,
          (d.bbox[1][1] - d.bbox[0][1]) * SF,
        );
      }); // forEach
  } // function drawBbox

  /////////////////////////////////////////////////////////////////
  //////////////////////// Helper Functions ///////////////////////
  /////////////////////////////////////////////////////////////////

  function mod(x, n) {
    return ((x % n) + n) % n;
  }

  function sq(x) {
    return x * x;
  }

  function isInteger(value) {
    return /^\d+$/.test(value);
  }

  /////////////////////////////////////////////////////////////////
  /////////////////////// Accessor functions //////////////////////
  /////////////////////////////////////////////////////////////////

  chart.width = function (value) {
    if (!arguments.length) return width;
    width = value;
    return chart;
  }; // chart.width

  chart.height = function (value) {
    if (!arguments.length) return height;
    height = value;
    return chart;
  }; // chart.height

  chart.repository = function (value) {
    if (!arguments.length) return REPO_CENTRAL;
    REPO_CENTRAL = value;
    return chart;
  }; // chart.repository

  /////////////////////////////////////////////////////////////////
  ////////////////////// Filtering Functions //////////////////////
  /////////////////////////////////////////////////////////////////

  chart.rebuild = function () {
    // Reset visualization state completely
    nodes = [];
    links = [];
    nodes_central = [];  // Reset derived array for central nodes

    // Reset interaction state
    clearAll(interactionState);
    clearDelaunay(interactionState);

    // Reset spatial data structures (will be rebuilt in resize())
    nodes_delaunay = [];
    delaunay = null;
    delaunay_remaining = null;
    // Note: clearDelaunay already called above via clearAll

    // Apply current filters
    applyFilters();

    // Re-run the full initialization pipeline
    prepareData();

    // Place the central repo in the middle (critical for positioning contributors)
    central_repo.x = central_repo.fx = 0;
    central_repo.y = central_repo.fy = 0;

    runOwnerSimulation(nodes, links, d3, getLinkNodeId, sqrt, max, min);
    runContributorSimulation(nodes, links, d3, getLinkNodeId, sqrt, max);
    positionContributorNodes();
    nodes_central = runCollaborationSimulation(
      nodes,
      links,
      d3,
      getLinkNodeId,
      sqrt,
      max,
      context,
      REPO_CENTRAL,
      central_repo,
      scale_link_distance,
      RADIUS_CONTRIBUTOR,
      INNER_RADIUS_FACTOR
    );
    if (REMAINING_PRESENT) {
      runRemainingSimulation(
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
      );
    }

    // Resolve any remaining string references in links
    resolveLinkReferences();

    // Position any nodes that didn't get positioned by force simulations
    // Critical for filtered data where force simulations may not include all nodes
    const unpositionedNodes = nodes.filter(n =>
      n.x === 0 && n.y === 0 && n.id !== REPO_CENTRAL
    );

    if (unpositionedNodes.length > 0) {
      // Get total counts by type for proper distribution
      const contributorCount = nodes.filter(n => n.type === 'contributor').length;
      const repoCount = nodes.filter(n => n.type === 'repo').length;

      let contributorIdx = 0;
      let repoIdx = 0;

      unpositionedNodes.forEach(node => {
        if (node.type === 'contributor') {
          // Distribute contributors evenly around outer circle
          const angle = (contributorIdx / Math.max(1, contributorCount)) * Math.PI * 2;
          const radius = 250; // Outer ring for contributors
          node.x = Math.cos(angle) * radius;
          node.y = Math.sin(angle) * radius;
          // Ensure radius property is set for gradient calculations
          if (!node.r) node.r = 6;
          contributorIdx++;
        } else if (node.type === 'repo') {
          // Distribute repos around middle zone
          const angle = (repoIdx / Math.max(1, repoCount)) * Math.PI * 2;
          const radius = 150 + Math.random() * 50;
          node.x = Math.cos(angle) * radius;
          node.y = Math.sin(angle) * radius;
          // Ensure radius property is set for gradient calculations
          if (!node.r) node.r = 8;
          repoIdx++;
        } else if (node.type === 'owner') {
          // Owners stay near center
          const angle = (repoIdx / 5) * Math.PI * 2;
          const radius = 50;
          node.x = Math.cos(angle) * radius;
          node.y = Math.sin(angle) * radius;
          // Ensure radius property is set for gradient calculations
          if (!node.r) node.r = 15;
        }
      });

      if (localStorage.getItem('debug-orca') === 'true') {
        console.debug(`Positioned ${unpositionedNodes.length} unpositioned nodes in rings by type`);
      }
    }

    // Ensure all nodes in links have valid, finite coordinates
    links.forEach(link => {
      if (link.source && link.target) {
        // Check/fix source coordinates
        if (typeof link.source.x !== 'number' || typeof link.source.y !== 'number' ||
          !isFinite(link.source.x) || !isFinite(link.source.y)) {
          link.source.x = 0;
          link.source.y = 0;
        }
        // Check/fix target coordinates
        if (typeof link.target.x !== 'number' || typeof link.target.y !== 'number' ||
          !isFinite(link.target.x) || !isFinite(link.target.y)) {
          link.target.x = 0;
          link.target.y = 0;
        }
      }
    });

    // Re-setup interaction handlers
    setupHover();
    setupClick();

    // Redraw with new scale factors
    chart.resize();

    return chart;
  };

  /**
   * Updates the active filters and rebuilds the chart
   * @param {string} organizationName - Organization to filter by
   * @param {boolean} enabled - Whether to enable or disable this filter
   * @returns {Object} - The chart instance
   */
  chart.setFilter = function (organizationName, enabled) {
    if (enabled) {
      addOrganization(activeFilters, organizationName);
    } else {
      removeOrganization(activeFilters, organizationName);
    }

    chart.rebuild();
    return chart;
  };

  chart.getActiveFilters = function () {
    return { ...activeFilters };
  };

  /**
   * DEBUG: Get internal nodes array for diagnostic purposes
   */
  chart.getNodes = function () {
    return nodes;
  };

  /**
   * DEBUG: Get internal links array for diagnostic purposes
   */
  chart.getLinks = function () {
    return links;
  };

  /**
   * DEBUG: Get debug state snapshot
   */
  chart.getDebugState = function () {
    const validLinks = links.filter(l =>
      l.source && l.target &&
      typeof l.source === 'object' && typeof l.target === 'object'
    );

    // Count how many links would be drawn (not to central repo)
    const drawnLinks = validLinks.filter(l => {
      const targetId = l.target.id || l.target;
      const sourceId = l.source.id || l.source;
      return targetId !== REPO_CENTRAL && sourceId !== REPO_CENTRAL;
    });

    // Count links that have valid coordinates for drawing
    const drawableLinks = drawnLinks.filter(l =>
      l.source && l.target &&
      typeof l.source.x === 'number' && typeof l.source.y === 'number' &&
      typeof l.target.x === 'number' && typeof l.target.y === 'number' &&
      isFinite(l.source.x) && isFinite(l.source.y) &&
      isFinite(l.target.x) && isFinite(l.target.y)
    );

    return {
      nodesCount: nodes.length,
      linksCount: links.length,
      nodeTypes: nodes.reduce((acc, n) => {
        acc[n.type] = (acc[n.type] || 0) + 1;
        return acc;
      }, {}),
      validLinks: validLinks.length,
      linksToBeDrawn: drawnLinks.length,
      linksWithValidCoordinates: drawableLinks.length,
      activeFilters: { ...activeFilters }
    };
  };

  return chart;
}; // function createORCAVisual

// ============================================================
// Exports (for ES module bundling)
// ============================================================
export { createORCAVisual };

// Also expose globally for non-module usage during transition
if (typeof window !== 'undefined') {
  window.createORCAVisual = createORCAVisual;
}
