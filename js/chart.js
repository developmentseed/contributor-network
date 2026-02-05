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
import { COLORS, FONTS, SIZES } from './config/theme.js';
import {
  isValidNode,
  isValidLink,
  getLinkNodeId,
  resolveLinkReferences
} from './utils/validation.js';
import {
  createRepoRadiusScale,
  createContributorRadiusScale,
  createRemainingContributorRadiusScale,
  createLinkDistanceScale,
  createLinkWidthScale
} from './config/scales.js';
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
} from './render/text.js';

// ============================================================
import {
  renderStatsLine,
  renderLanguages,
  renderCommunityMetrics,
  renderLicense,
  renderArchivedBadge,
  REPO_CARD_CONFIG
} from './render/repoCard.js';
import {
  runOwnerSimulation,
  runContributorSimulation,
  runCollaborationSimulation,
  runRemainingSimulation
} from './simulations/index.js';
import {
  createFilterState,
  addOrganization,
  removeOrganization,
  clearFilters,
  hasOrganization,
  hasActiveFilters
} from './state/filterState.js';
import { prepareData } from './data/prepare.js';
import { positionContributorNodes } from './layout/positioning.js';
import { draw as drawVisualization } from './render/draw.js';
import {
  createInteractionState,
  setHovered,
  clearHover,
  setClicked,
  clearClick,
  clearAll,
  setDelaunay,
  clearDelaunay
} from './state/interactionState.js';
import { findNode as findNodeAtPosition } from './interaction/findNode.js';
import { setupHover as setupHoverInteraction } from './interaction/hover.js';
import { setupClick as setupClickInteraction } from './interaction/click.js';
import {
  setupZoom as setupZoomModule,
  applyZoomTransform,
  shouldSuppressClick,
  transformMouseCoordinates
} from './interaction/zoom.js';
import {
  drawCircle,
  drawCircleArc,
  drawLine,
  drawNode,
  drawNodeArc,
  drawHoverRing,
  timeRangeArc,
  drawHatchPattern,
  drawLink
} from './render/shapes.js';
import { drawTooltip as drawTooltipModule } from './render/tooltip.js';
import { drawNodeLabel } from './render/labels.js';
import { LAYOUT } from './config/theme.js';

// Extract commonly used constants for convenience
const DEFAULT_SIZE = LAYOUT.defaultSize;
import { handleResize, sizeCanvas, calculateScaleFactor } from './layout/resize.js';

// ============================================================
// Main Visualization
// ============================================================
const createContributorNetworkVisual = (
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
  let contributors, remainingContributors;
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
  
  // Convenience references to Delaunay data
  // These are kept in sync with interactionState and delaunayData object
  let delaunay;
  let nodes_delaunay;
  let delaunay_remaining;
  
  // Helper to sync local variables with delaunayData
  function syncDelaunayVars(delaunayData) {
    delaunay = delaunayData.delaunay;
    nodes_delaunay = delaunayData.nodesDelaunay;
    delaunay_remaining = delaunayData.delaunayRemaining;
  }

  /////////////////////////////////////////////////////////////////
  // Zoom State Management
  /////////////////////////////////////////////////////////////////
  // Zoom state object (will be mutated by setupZoom)
  const zoomState = {};
  const ZOOM_CLICK_SUPPRESS_MS = 150;

  // Visual Settings - Based on SF = 1
  // Layout constants imported from src/js/config/theme.js
  const CENTRAL_RADIUS = LAYOUT.centralRadius; // The radius of the central repository node (reduced for less prominence)
  let RADIUS_CONTRIBUTOR; // The eventual radius along which the contributor nodes are placed
  let CONTRIBUTOR_RING_WIDTH;

  const INNER_RADIUS_FACTOR = LAYOUT.innerRadiusFactor; // The factor of the RADIUS_CONTRIBUTOR outside of which the inner repos are not allowed to go in the force simulation
  const MAX_CONTRIBUTOR_WIDTH = LAYOUT.maxContributorWidth; // The maximum width (at SF = 1) of the contributor name before it gets wrapped
  const CONTRIBUTOR_PADDING = contributor_padding; // The padding between the contributor nodes around the circle (at SF = 1)

  let REMAINING_PRESENT = false; // Is the dataset of remaining contributors present?

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

  // canvas_click is positioned by styleBackgroundCanvas, but needs pointer events
  canvas_click.style.pointerEvents = "auto";
  canvas_click.style.zIndex = "1";

  canvas_hover.style.position = "absolute";
  canvas_hover.style.top = "0";
  canvas_hover.style.left = "0";
  canvas_hover.style.zIndex = "2";
  canvas_hover.style.pointerEvents = "auto"; // Hover canvas needs pointer events for hover to work

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
  // DEFAULT_SIZE extracted from LAYOUT.defaultSize in theme.js
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
        } // if
    } // if

    // Prepare data using extracted module
    const prepared = prepareData(
      {
        contributors,
        repos,
        links,
        remainingContributors: REMAINING_PRESENT ? remainingContributors : []
      },
      {
        d3,
        REPO_CENTRAL,
        REMAINING_PRESENT,
        COLOR_CONTRIBUTOR,
        COLOR_REPO,
        COLOR_OWNER,
        COLOR_REPO_MAIN,
        MAX_CONTRIBUTOR_WIDTH,
        CENTRAL_RADIUS,
        context,
        isValidContributor,
        setContributorFont,
        getLines
      },
      {
        scale_repo_radius,
        scale_contributor_radius,
        scale_link_width,
        scale_remaining_contributor_radius
      }
    );

    // Validate prepareData return structure
    if (!prepared || typeof prepared !== 'object') {
      throw new Error('prepareData returned invalid result: expected object');
    }
    if (!Array.isArray(prepared.nodes) || prepared.nodes.length === 0) {
      throw new Error('prepareData returned invalid nodes: expected non-empty array');
    }
    if (!prepared.central_repo) {
      throw new Error(`prepareData: central repository "${REPO_CENTRAL}" not found in prepared data`);
    }
    if (!Array.isArray(prepared.links)) {
      throw new Error('prepareData returned invalid links: expected array');
    }

    // Update local variables from prepared data
    nodes = prepared.nodes;
    nodes_central = prepared.nodes_central;
    links = prepared.links;
    central_repo = prepared.central_repo;
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
    const positioningResult = positionContributorNodes(
      { nodes, contributors, central_repo },
      { CONTRIBUTOR_PADDING }
    );
    RADIUS_CONTRIBUTOR = positioningResult.RADIUS_CONTRIBUTOR;
    CONTRIBUTOR_RING_WIDTH = positioningResult.CONTRIBUTOR_RING_WIDTH;
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
      {
        context,
        REPO_CENTRAL,
        central_repo,
        scale_link_distance,
        RADIUS_CONTRIBUTOR,
        INNER_RADIUS_FACTOR
      }
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
        CONTRIBUTOR_RING_WIDTH,
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
    links = resolveLinkReferences(links, nodes);

    /////////////////////////////////////////////////////////////
    ///////////// Set the Sizes and Draw the Visual /////////////
    /////////////////////////////////////////////////////////////
    chart.resize();

    /////////////////////////////////////////////////////////////
    ////////////////////// Setup Interactions ////////////////////
    /////////////////////////////////////////////////////////////
    // Setup interactions AFTER resize so they have correct WIDTH/HEIGHT/SF values
    setupHover();
    setupClick();
    setupZoom();
  } // function chart

  /////////////////////////////////////////////////////////////////
  /////////////////////// Zoom Helpers ////////////////////////////
  /////////////////////////////////////////////////////////////////
  // Note: applyZoomTransform is imported from src/js/interaction/zoom.js
  // This redrawAll function uses the modular approach with interactionState

  // Redraw all canvas layers (main, hover, click)
  function redrawAll() {
    draw();
    if (interactionState.CLICK_ACTIVE && interactionState.CLICKED_NODE) {
      context_click.clearRect(0, 0, WIDTH, HEIGHT);
      context_click.save();
      applyZoomTransform(context_click, zoomState.zoomTransform || d3.zoomIdentity, PIXEL_RATIO, WIDTH, HEIGHT);
      drawHoverState(context_click, interactionState.CLICKED_NODE, false);
      context_click.restore();
    } else {
      context_click.clearRect(0, 0, WIDTH, HEIGHT);
    }
    if (interactionState.HOVER_ACTIVE && interactionState.HOVERED_NODE) {
      context_hover.clearRect(0, 0, WIDTH, HEIGHT);
      context_hover.save();
      applyZoomTransform(context_hover, zoomState.zoomTransform || d3.zoomIdentity, PIXEL_RATIO, WIDTH, HEIGHT);
      drawHoverState(context_hover, interactionState.HOVERED_NODE);
      context_hover.restore();
    } else {
      context_hover.clearRect(0, 0, WIDTH, HEIGHT);
    }
  } // function redrawAll

  /////////////////////////////////////////////////////////////////
  //////////////////////// Draw the visual ////////////////////////
  /////////////////////////////////////////////////////////////////

  // Draw the visual - extracted to src/js/render/draw.js
  function draw() {
    // IMPORTANT: Background clearing is intentionally handled here, NOT in draw.js
    // Clear must happen BEFORE zoom transform is applied - otherwise only the
    // transformed (zoomed/panned) area gets cleared, causing ghost images.
    // See src/js/render/draw.js for the corresponding NOTE comment.
    context.fillStyle = COLOR_BACKGROUND;
    context.fillRect(0, 0, WIDTH, HEIGHT);

    // Apply zoom transform before drawing
    context.save();
    applyZoomTransform(context, zoomState.zoomTransform || d3.zoomIdentity, PIXEL_RATIO, WIDTH, HEIGHT);

    drawVisualization(
      context,
      { nodes, links, nodes_central },
      { WIDTH, HEIGHT, SF, COLOR_BACKGROUND, REPO_CENTRAL, RADIUS_CONTRIBUTOR, CONTRIBUTOR_RING_WIDTH },
      {
        drawLink: drawLinkWrapper,
        drawNodeArc: drawNodeArcWrapper,
        drawNode: drawNodeWrapper,
        drawNodeLabel: drawNodeLabelWrapper
      }
    );
    
    context.restore();
  } // function draw

  /////////////////////////////////////////////////////////////////
  //////////////////////// Resize the chart ///////////////////////
  /////////////////////////////////////////////////////////////////
  // Extracted to src/js/layout/resize.js
  chart.resize = () => {
    // Debug: Log resize call
    console.log('chart.resize() called', { width, height, nodesCount: nodes.length });
    
    const canvases = {
      canvas,
      canvas_click,
      canvas_hover
    };
    const contexts = {
      context,
      context_click,
      context_hover
    };
    const config = {
      width,
      height,
      DEFAULT_SIZE,
      RADIUS_CONTRIBUTOR,
      CONTRIBUTOR_RING_WIDTH,
      round
    };
    const state = {
      WIDTH,
      HEIGHT,
      PIXEL_RATIO,
      SF,
      nodes_delaunay,
      delaunay,
      delaunay_remaining
    };
    const data = {
      nodes,
      remainingContributors
    };
    
    // Update local variables from state object BEFORE calling handleResize
    // so that draw() uses the correct values
    WIDTH = state.WIDTH;
    HEIGHT = state.HEIGHT;
    PIXEL_RATIO = state.PIXEL_RATIO;
    SF = state.SF;
    
    // Create a wrapper for draw() that updates local variables first
    const drawWithUpdatedState = () => {
      // Update local variables from state object before drawing
      WIDTH = state.WIDTH;
      HEIGHT = state.HEIGHT;
      PIXEL_RATIO = state.PIXEL_RATIO;
      SF = state.SF;
      nodes_delaunay = state.nodes_delaunay;
      delaunay = state.delaunay;
      delaunay_remaining = state.delaunay_remaining;
      // Now draw with updated values
      draw();
    };
    
    handleResize(
      canvases,
      contexts,
      config,
      state,
      data,
      {
        REMAINING_PRESENT,
        d3,
        setDelaunay,
        interactionState,
        draw: drawWithUpdatedState
      }
    );
    
    // Update local variables from state object after resize (in case they changed)
    WIDTH = state.WIDTH;
    HEIGHT = state.HEIGHT;
    PIXEL_RATIO = state.PIXEL_RATIO;
    SF = state.SF;
    nodes_delaunay = state.nodes_delaunay;
    delaunay = state.delaunay;
    delaunay_remaining = state.delaunay_remaining;
    
    // Debug: Log after resize
    console.log('chart.resize() completed', { WIDTH, HEIGHT, SF, nodesCount: nodes.length });
  }; //function resize

  /////////////////////////////////////////////////////////////////
  /////////////////// Data Preparation Functions //////////////////
  /////////////////////////////////////////////////////////////////

  //////////////// Apply filters to the data ////////////////
  // NOTE: Pure filter logic has been extracted to src/js/data/filter.js
  // This function handles integration with the visualization's mutable state.
  // For new features (e.g., blog charts), import { applyFilters } from './data/filter.js'
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
    if (localStorage.getItem('debug-contributor-network') === 'true') {
      console.debug('=== APPLY FILTERS ===');
      console.debug(`Filters applied: ${activeFilters.organizations.join(", ") || "none"}`);
      console.debug(`Data before: ${originalContributors.length} contributors, ${originalRepos.length} repos, ${originalLinks.length} links`);
      console.debug(`Data after: ${visibleContributors.length} contributors, ${visibleRepos.length} repos, ${visibleLinks.length} links`);
      console.debug('Visible repos:', visibleRepos.map(r => r.repo));
      console.debug('Visible contributors:', visibleContributors.map(c => c.author_name));
    }
  }

  //////////////// Prepare the data for the visual ////////////////
  // Extracted to src/js/data/prepare.js


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
  // Extracted to src/js/layout/positioning.js

  /////////////////////////////////////////////////////////////////
  ///////////// Force Simulation | Collaboration Repos ////////////
  /////////////////////////////////////////////////////////////////
  // Extracted to src/js/simulations/collaborationSimulation.js

  /////////////////////////////////////////////////////////////////
  ///////////// Force Simulation | Other Contributors /////////////
  /////////////////////////////////////////////////////////////////
  // Extracted to src/js/simulations/remainingSimulation.js


  /////////////////////////////////////////////////////////////////
  ///////////////////// Node Drawing Functions ////////////////////
  /////////////////////////////////////////////////////////////////

  // Extracted to src/js/render/shapes.js
  // Wrapper to adapt old signature to new module signature
  function drawNodeWrapper(context, SF, d) {
    const config = { REPO_CENTRAL, COLOR_BACKGROUND, max };
    drawNode(context, SF, d, config, interactionState);
  }

  // Extracted to src/js/render/shapes.js
  // Wrapper to adapt old signature to new module signature
  function drawNodeArcWrapper(context, SF, d) {
    drawNodeArc(context, SF, d, interactionState, COLOR_CONTRIBUTOR, d3, central_repo);
  }

  // Extracted to src/js/render/shapes.js
  // Wrapper to adapt old signature to new module signature
  function drawHoverRingWrapper(context, d) {
    drawHoverRing(context, d, SF, central_repo);
  }

  // Extracted to src/js/render/shapes.js
  // Wrapper to adapt old signature to new module signature
  function timeRangeArcWrapper(context, SF, d, repo, link, COL = COLOR_REPO_MAIN) {
    timeRangeArc(context, SF, d, repo, link, COL, d3, central_repo);
  }

  // Extracted to src/js/render/shapes.js
  // Wrapper to adapt old signature to new module signature
  function drawHatchPatternWrapper(context, radius, angle, d) {
    drawHatchPattern(context, radius, angle, SF, d.color, sin);
  }

  // Extracted to src/js/render/shapes.js
  // drawCircle is now imported directly

  /////////////////////////////////////////////////////////////////
  ///////////////////// Line Drawing Functions ////////////////////
  /////////////////////////////////////////////////////////////////

  // Extracted to src/js/render/shapes.js
  // Wrapper to adapt old signature to new module signature
  function drawLinkWrapper(context, SF, l) {
    const config = { COLOR_LINK };
    drawLink(context, SF, l, config, interactionState, calculateLinkGradient, calculateEdgeCenters, scale_link_width);
  }

  // Extracted to src/js/render/shapes.js
  // drawLine and drawCircleArc are now imported directly

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
          if (localStorage.getItem('debug-contributor-network') === 'true') {
            console.warn('Gradient creation error:', e, { link: l, sf: SF });
          }
          l.gradient = COLOR_LINK;
        }
      } else {
        // Gradient can't be created - invalid coordinates
        if (localStorage.getItem('debug-contributor-network') === 'true') {
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
  // Extracted to src/js/interaction/hover.js
  function setupHover() {
    const config = {
      PIXEL_RATIO,
      WIDTH,
      HEIGHT,
      SF,
      RADIUS_CONTRIBUTOR,
      CONTRIBUTOR_RING_WIDTH,
      sqrt
    };
    // Create delaunayData object that will be kept in sync
    const delaunayData = {
      get delaunay() { return delaunay; },
      set delaunay(val) { delaunay = val; },
      get nodesDelaunay() { return nodes_delaunay; },
      set nodesDelaunay(val) { nodes_delaunay = val; },
      get delaunayRemaining() { return delaunay_remaining; },
      set delaunayRemaining(val) { delaunay_remaining = val; }
    };
    
    setupHoverInteraction({
      d3,
      canvasSelector: "#canvas-hover",
      config,
      delaunayData,
      interactionState,
      REPO_CENTRAL,
      canvas,
      contextHover: context_hover,
      REMAINING_PRESENT,
      remainingContributors,
      setHovered,
      clearHover,
      drawHoverState,
      zoomState
    });
  } // function setupHover

  // Draw the hovered node and its links and neighbors and a tooltip
  function drawHoverState(context, d, DO_TOOLTIP = true) {
    // Note: Zoom transform should already be applied by the caller (in redrawAll)
    // This function assumes the context is already transformed
    // Draw the hover canvas
    context.save();

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
        if (l && l.source && l.target) drawLinkWrapper(context, SF, l);
      }); // forEach
    }

    // Draw all the connected nodes (with null safety)
    if (d.neighbors) {
      d.neighbors.forEach((n) => { if (n) drawNodeArcWrapper(context, SF, n); });
      d.neighbors.forEach((n) => { if (n) drawNodeWrapper(context, SF, n); });
      // Draw all the labels of the "central" connected nodes
      d.neighbors.forEach((n) => {
        if (n && n.node_central) drawNodeLabelWrapper(context, n);
      }); // forEach
    }

    /////////////////////////////////////////////////
    // Draw the hovered node
    drawNodeWrapper(context, SF, d);
    // Show a ring around the hovered node
    drawHoverRingWrapper(context, d);

    /////////////////////////////////////////////////
    // Show its label
    if (d.node_central && d.type === "contributor") drawNodeLabelWrapper(context, d);

    /////////////////////////////////////////////////
    // Create a tooltip with more info
    if (DO_TOOLTIP) drawTooltipWrapper(context, d);

    context.restore();
  } // function drawHoverState

  /////////////////////////////////////////////////////////////////
  //////////////////////// Click Functions ////////////////////////
  /////////////////////////////////////////////////////////////////
  // Extracted to src/js/interaction/click.js
  function setupClick() {
    const config = {
      PIXEL_RATIO,
      WIDTH,
      HEIGHT,
      SF,
      RADIUS_CONTRIBUTOR,
      CONTRIBUTOR_RING_WIDTH,
      sqrt
    };
    // Create delaunayData object that will be kept in sync
    const delaunayData = {
      get delaunay() { return delaunay; },
      set delaunay(val) { delaunay = val; },
      get nodesDelaunay() { return nodes_delaunay; },
      set nodesDelaunay(val) { nodes_delaunay = val; },
      get delaunayRemaining() { return delaunay_remaining; },
      set delaunayRemaining(val) { delaunay_remaining = val; }
    };
    
    setupClickInteraction({
      d3,
      canvasSelector: "#canvas-hover", // Use hover canvas for clicks too since it's on top
      config,
      delaunayData,
      interactionState,
      REPO_CENTRAL,
      canvas,
      contextClick: context_click,
      contextHover: context_hover,
      nodes,
      REMAINING_PRESENT,
      remainingContributors,
      setClicked,
      clearClick,
      clearHover,
      setDelaunay,
      drawHoverState,
      zoomState,
      ZOOM_CLICK_SUPPRESS_MS
    });
  } // function setupClick

  /////////////////////////////////////////////////////////////////
  //////////////////////// Zoom Functions /////////////////////////
  /////////////////////////////////////////////////////////////////
  // Extracted to src/js/interaction/zoom.js
  function setupZoom() {
    setupZoomModule({
      d3,
      canvasSelector: "#canvas-hover",
      state: zoomState,
      redrawAll,
      ZOOM_CLICK_SUPPRESS_MS
    });
  } // function setupZoom

  /////////////////////////////////////////////////////////////////
  ///////////////// General Interaction Functions /////////////////
  /////////////////////////////////////////////////////////////////
  // Extracted to src/js/interaction/findNode.js
  // Note: findNode is now imported and used directly in hover.js and click.js

  // Draw the tooltip above the node
  // Extracted to src/js/render/tooltip.js
  // Wrapper to adapt old signature to new module signature
  function drawTooltipWrapper(context, d) {
    const config = {
      SF,
      REPO_CENTRAL,
      COLOR_BACKGROUND,
      COLOR_TEXT,
      COLOR_CONTRIBUTOR,
      COLOR_REPO,
      COLOR_OWNER,
      min
    };
    drawTooltipModule(context, d, config, interactionState, central_repo, formatDate, formatDateExact, formatDigit);
  }
  
  // Keep old function name for compatibility - delegate to wrapper
  function drawTooltip(context, d) {
    return drawTooltipWrapper(context, d);
  }
  
  // Wrapper to adapt old signature to new module signature
  function drawNodeLabelWrapper(context, d, DO_CENTRAL_OUTSIDE = false) {
    const config = {
      SF,
      REPO_CENTRAL,
      COLOR_TEXT,
      COLOR_BACKGROUND,
      COLOR_REPO_MAIN,
      PI
    };
    drawNodeLabel(context, d, config, central_repo, DO_CENTRAL_OUTSIDE);
  }

  // =============================================================================
  // NOTE: The following functions have been extracted to modules:
  // - drawTooltip → src/js/render/tooltip.js
  // - drawNodeLabel → src/js/render/labels.js
  // - text/font functions → src/js/render/text.js
  //
  // The wrapper functions above (drawTooltipWrapper, drawNodeLabelWrapper)
  // import and call these modular implementations.
  // =============================================================================

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
    const prepared = prepareData(
      {
        contributors,
        repos,
        links,
        remainingContributors: REMAINING_PRESENT ? remainingContributors : []
      },
      {
        d3,
        REPO_CENTRAL,
        REMAINING_PRESENT,
        COLOR_CONTRIBUTOR,
        COLOR_REPO,
        COLOR_OWNER,
        COLOR_REPO_MAIN,
        MAX_CONTRIBUTOR_WIDTH,
        CENTRAL_RADIUS,
        context,
        isValidContributor,
        setContributorFont,
        getLines
      },
      {
        scale_repo_radius,
        scale_contributor_radius,
        scale_link_width,
        scale_remaining_contributor_radius
      }
    );

    // Validate prepareData return structure
    if (!prepared || typeof prepared !== 'object') {
      console.error('rebuild: prepareData returned invalid result');
      return chart;
    }
    if (!Array.isArray(prepared.nodes) || prepared.nodes.length === 0) {
      console.error('rebuild: prepareData returned empty nodes - filters may be too restrictive');
      return chart;
    }
    if (!prepared.central_repo) {
      console.error(`rebuild: central repository "${REPO_CENTRAL}" not found`);
      return chart;
    }

    // Update local variables from prepared data
    nodes = prepared.nodes;
    nodes_central = prepared.nodes_central;
    links = prepared.links;
    central_repo = prepared.central_repo;

    // Place the central repo in the middle (critical for positioning contributors)
    central_repo.x = central_repo.fx = 0;
    central_repo.y = central_repo.fy = 0;

    runOwnerSimulation(nodes, links, d3, getLinkNodeId, sqrt, max, min);
    runContributorSimulation(nodes, links, d3, getLinkNodeId, sqrt, max);
    const positioningResult = positionContributorNodes(
      { nodes, contributors, central_repo },
      { CONTRIBUTOR_PADDING }
    );
    RADIUS_CONTRIBUTOR = positioningResult.RADIUS_CONTRIBUTOR;
    CONTRIBUTOR_RING_WIDTH = positioningResult.CONTRIBUTOR_RING_WIDTH;
    nodes_central = runCollaborationSimulation(
      nodes,
      links,
      d3,
      getLinkNodeId,
      sqrt,
      max,
      {
        context,
        REPO_CENTRAL,
        central_repo,
        scale_link_distance,
        RADIUS_CONTRIBUTOR,
        INNER_RADIUS_FACTOR
      }
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
        CONTRIBUTOR_RING_WIDTH,
        DEFAULT_SIZE,
        scale_remaining_contributor_radius
      );
    }

    // Resolve any remaining string references in links
    links = resolveLinkReferences(links, nodes);

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

      if (localStorage.getItem('debug-contributor-network') === 'true') {
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
    setupZoom();

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
}; // function createContributorNetworkVisual

// ============================================================
// Exports (for ES module bundling)
// ============================================================
export { createContributorNetworkVisual };

// Also expose globally for non-module usage during transition
if (typeof window !== 'undefined') {
  window.createContributorNetworkVisual = createContributorNetworkVisual;
}
