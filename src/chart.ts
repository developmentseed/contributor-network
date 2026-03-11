// This file was copied-and-modified from
// https://github.com/nbremer/ORCA/blob/77745774d9d189818ab1ba27e07979897434abf9/top-contributor-network/createORCAVisual.js,
// and is licensed under the same (MPL).
//
// Development Seed Modifications:
// - Updated color scheme to DevSeed brand (Grenadier orange, Aquamarine blue)
// - Removed the central "team" pseudo-node entirely (force simulation finds natural equilibrium)
// - Contributors positioned in fixed ring around viewport center
// - Added null safety checks for hover/click interactions
// - Added boundary checking to prevent hover outside visualization area
// - Added mouseleave handler to properly clean up hover state
// - Refactored to use modular components (Phase 1 & 2 data expansion)
//
/////////////////////////////////////////////////////////////////////
/////////////// Visualization designed & developed by ///////////////
/////////////////////////// Nadieh Bremer ///////////////////////////
///////////////////////// VisualCinnamon.com ////////////////////////
/////////////////////////////////////////////////////////////////////

import * as d3 from "d3";
import type {
  VisualizationNode,
  LinkData,
  InteractionState,
  FilterState,
  ZoomState,
  PreparedData,
} from "./types";
import { COLORS, LAYOUT } from "./config/theme";
import {
  getLinkNodeId,
  resolveLinkReferences,
} from "./utils/validation";
import {
  createRepoRadiusScale,
  createOwnerRadiusScale,
  createContributorRadiusScale,
  createLinkDistanceScale,
  createLinkWidthScale,
} from "./config/scales";
import {
  setContributorFont,
  getLines,
} from "./render/text";
import {
  runOwnerSimulation,
  runContributorSimulation,
  runCollaborationSimulation,
} from "./simulations/index";
import {
  createFilterState,
  addOrganization,
  removeOrganization,
  hasOrganization,
  setMetricFilter,
  type MetricKey,
} from "./state/filterState";
import { prepareData } from "./data/prepare";
import { positionContributorNodes } from "./layout/positioning";
import { draw as drawVisualization } from "./render/draw";
import {
  createInteractionState,
  setHovered,
  clearHover,
  setClicked,
  clearClick,
  clearAll,
  setDelaunay,
  clearDelaunay,
} from "./state/interactionState";
import { setupHover as setupHoverInteraction } from "./interaction/hover";
import { setupClick as setupClickInteraction } from "./interaction/click";
import {
  setupZoom as setupZoomModule,
  applyZoomTransform,
} from "./interaction/zoom";
import {
  drawNode,
  drawNodeArc,
  drawHoverRing,
  timeRangeArc,
  drawHatchPattern,
  drawLink,
} from "./render/shapes";
import { drawTooltip as drawTooltipModule } from "./render/tooltip";
import { drawNodeLabel } from "./render/labels";
import { handleResize, calculateScaleFactor } from "./layout/resize";

const DEFAULT_SIZE = LAYOUT.defaultSize;

interface ChartFunction {
  (values: d3.DSVRowArray<string>[]): void;
  width(): number;
  width(value: number): ChartFunction;
  height(): number;
  height(value: number): ChartFunction;
  resize(): void;
  rebuild(): ChartFunction;
  setFilter(organizationName: string, enabled: boolean): ChartFunction;
  setRepoFilter(metric: string, value: number | null): ChartFunction;
  getActiveFilters(): FilterState;
  getNodes(): VisualizationNode[];
  getLinks(): LinkData[];
  getDebugState(): Record<string, unknown>;
}

export const createContributorNetworkVisual = (
  container: HTMLElement,
  contributor_padding: number,
  masterContributorsList: Record<string, string>,
  displayNameMap: Record<string, string>
): ChartFunction => {
  const PI = Math.PI;
  const TAU = PI * 2;

  const round = Math.round;
  const cos = Math.cos;
  const sin = Math.sin;
  const min = Math.min;
  const max = Math.max;
  const sqrt = Math.sqrt;

  let activeFilters = createFilterState();

  let masterContributors = masterContributorsList;
  let displayNameToUsername = displayNameMap;

  function isValidContributor(displayName: string): boolean {
    if (!displayNameToUsername || !masterContributors) return true;
    const username = displayNameToUsername[displayName];
    return !!(username && masterContributors[username]);
  }

  let originalContributors: any[];
  let originalRepos: any[];
  let originalLinks: any[];

  let visibleRepos: any[];
  let visibleLinks: any[];
  let visibleContributors: any[];

  let contributors: any[];
  let repos: any[];
  let nodes: VisualizationNode[] = [];
  let nodes_central: VisualizationNode[];
  let links: LinkData[];

  let interactionState: InteractionState = createInteractionState();

  let delaunay: d3.Delaunay<[number, number]> | null;
  let nodes_delaunay: VisualizationNode[];

  interface DelaunayDataProxy {
    delaunay: any;
    nodesDelaunay: VisualizationNode[];
  }

  const zoomState: ZoomState = {} as ZoomState;
  const ZOOM_CLICK_SUPPRESS_MS = 150;

  const CENTRAL_RADIUS = LAYOUT.centralRadius;
  let RADIUS_CONTRIBUTOR: number;
  let CONTRIBUTOR_RING_WIDTH: number;

  const INNER_RADIUS_FACTOR = LAYOUT.innerRadiusFactor;
  const MAX_CONTRIBUTOR_WIDTH = LAYOUT.maxContributorWidth;
  const CONTRIBUTOR_PADDING = contributor_padding;

  const COLOR_BACKGROUND = COLORS.background;
  const COLOR_PURPLE = COLORS.grenadier;
  const COLOR_REPO_MAIN = COLORS.repoMain;
  const COLOR_REPO = COLORS.repo;
  const COLOR_OWNER = COLORS.owner;
  const COLOR_CONTRIBUTOR = COLORS.contributor;
  const COLOR_LINK = COLORS.link;
  const COLOR_TEXT = COLORS.text;

  const canvas = document.createElement("canvas");
  canvas.id = "canvas";
  const context = canvas.getContext("2d")!;

  const canvas_click = document.createElement("canvas");
  canvas_click.id = "canvas-click";
  const context_click = canvas_click.getContext("2d")!;

  const canvas_hover = document.createElement("canvas");
  canvas_hover.id = "canvas-hover";
  const context_hover = canvas_hover.getContext("2d")!;

  container.appendChild(canvas);
  container.appendChild(canvas_click);
  container.appendChild(canvas_hover);

  container.style.position = "relative";
  container.style.backgroundColor = COLOR_BACKGROUND;

  function localStyleCanvas(c: HTMLCanvasElement): void {
    c.style.display = "block";
    c.style.margin = "0";
  }

  function localStyleBackgroundCanvas(c: HTMLCanvasElement): void {
    c.style.position = "absolute";
    c.style.top = "0";
    c.style.left = "0";
    c.style.pointerEvents = "none";
    c.style.zIndex = "0";
    c.style.transition = "opacity 200ms ease-in";
  }

  localStyleCanvas(canvas);
  localStyleCanvas(canvas_hover);
  localStyleCanvas(canvas_click);

  localStyleBackgroundCanvas(canvas);
  localStyleBackgroundCanvas(canvas_click);

  canvas_click.style.pointerEvents = "auto";
  canvas_click.style.zIndex = "1";

  canvas_hover.style.position = "absolute";
  canvas_hover.style.top = "0";
  canvas_hover.style.left = "0";
  canvas_hover.style.zIndex = "2";
  canvas_hover.style.pointerEvents = "auto";

  let WIDTH = DEFAULT_SIZE;
  let HEIGHT = DEFAULT_SIZE;
  let width = DEFAULT_SIZE;
  let height = DEFAULT_SIZE;
  let SF: number;
  let PIXEL_RATIO: number;

  const formatDate = d3.timeFormat("%b %Y");
  const formatDateExact = d3.timeFormat("%b %d, %Y");
  const formatDigit = d3.format(",.2s");

  const scale_repo_radius = createRepoRadiusScale();
  const scale_owner_radius = createOwnerRadiusScale();
  const scale_contributor_radius = createContributorRadiusScale();
  const scale_link_distance = createLinkDistanceScale();
  const scale_link_width = createLinkWidthScale();

  function chart(values: d3.DSVRowArray<string>[]): void {
    originalContributors = JSON.parse(JSON.stringify(values[0]));
    originalRepos = JSON.parse(JSON.stringify(values[1]));
    originalLinks = JSON.parse(JSON.stringify(values[2]));

    applyFiltersInternal();

    const prepared = prepareData(
      { contributors, repos, links: links as any },
      {
        COLOR_CONTRIBUTOR,
        COLOR_REPO,
        COLOR_OWNER,
        MAX_CONTRIBUTOR_WIDTH,
        context,
        isValidContributor,
        setContributorFont,
        getLines,
      },
      {
        scale_repo_radius,
        scale_owner_radius,
        scale_contributor_radius,
        scale_link_width,
      }
    );

    if (!prepared || typeof prepared !== "object") {
      throw new Error("prepareData returned invalid result: expected object");
    }
    if (!Array.isArray(prepared.nodes) || prepared.nodes.length === 0) {
      throw new Error(
        "prepareData returned invalid nodes: expected non-empty array"
      );
    }
    if (!Array.isArray(prepared.links)) {
      throw new Error("prepareData returned invalid links: expected array");
    }

    nodes = prepared.nodes;
    nodes_central = prepared.nodes_central;
    links = prepared.links;

    runOwnerSimulation(nodes, links);
    runContributorSimulation(nodes, links);

    const positioningResult = positionContributorNodes(
      { nodes, contributors },
      { CONTRIBUTOR_PADDING }
    );
    RADIUS_CONTRIBUTOR = positioningResult.RADIUS_CONTRIBUTOR;
    CONTRIBUTOR_RING_WIDTH = positioningResult.CONTRIBUTOR_RING_WIDTH;

    nodes_central = runCollaborationSimulation(nodes, links, {
      context,
      scale_link_distance,
      RADIUS_CONTRIBUTOR,
      INNER_RADIUS_FACTOR,
    });

    links = resolveLinkReferences(links, nodes);

    chart.resize();

    setupHover();
    setupClick();
  }

  function redrawAll(): void {
    draw();
    if (interactionState.clickActive && interactionState.clickedNode) {
      context_click.clearRect(0, 0, WIDTH, HEIGHT);
      context_click.save();
      applyZoomTransform(
        context_click,
        zoomState.zoomTransform || d3.zoomIdentity,
        PIXEL_RATIO,
        WIDTH,
        HEIGHT
      );
      drawHoverState(context_click, interactionState.clickedNode, false);
      context_click.restore();
    } else {
      context_click.clearRect(0, 0, WIDTH, HEIGHT);
    }
    if (interactionState.hoverActive && interactionState.hoveredNode) {
      context_hover.clearRect(0, 0, WIDTH, HEIGHT);
      context_hover.save();
      applyZoomTransform(
        context_hover,
        zoomState.zoomTransform || d3.zoomIdentity,
        PIXEL_RATIO,
        WIDTH,
        HEIGHT
      );
      drawHoverState(context_hover, interactionState.hoveredNode);
      context_hover.restore();
    } else {
      context_hover.clearRect(0, 0, WIDTH, HEIGHT);
    }
  }

  function draw(): void {
    context.fillStyle = COLOR_BACKGROUND;
    context.fillRect(0, 0, WIDTH, HEIGHT);

    context.save();
    applyZoomTransform(
      context,
      zoomState.zoomTransform || d3.zoomIdentity,
      PIXEL_RATIO,
      WIDTH,
      HEIGHT
    );

    drawVisualization(
      context,
      { nodes, links, nodes_central },
      {
        WIDTH,
        HEIGHT,
        SF,
        COLOR_BACKGROUND,
        RADIUS_CONTRIBUTOR,
        CONTRIBUTOR_RING_WIDTH,
      },
      {
        drawLink: drawLinkWrapper,
        drawNodeArc: drawNodeArcWrapper,
        drawNode: drawNodeWrapper,
        drawNodeLabel: drawNodeLabelWrapper,
      }
    );

    context.restore();
  }

  chart.resize = (): void => {
    console.log("chart.resize() called", {
      width,
      height,
      nodesCount: nodes.length,
    });

    const canvases = {
      canvas,
      canvas_click,
      canvas_hover,
    };
    const contexts = {
      context,
      context_click,
      context_hover,
    };
    const config = {
      width,
      height,
      DEFAULT_SIZE,
      RADIUS_CONTRIBUTOR,
      CONTRIBUTOR_RING_WIDTH,
      round,
    };
    const state: any = {
      WIDTH,
      HEIGHT,
      PIXEL_RATIO,
      SF,
      nodes_delaunay,
      delaunay,
    };
    const data = {
      nodes,
    };

    WIDTH = state.WIDTH;
    HEIGHT = state.HEIGHT;
    PIXEL_RATIO = state.PIXEL_RATIO;
    SF = state.SF;

    const drawWithUpdatedState = (): void => {
      WIDTH = state.WIDTH;
      HEIGHT = state.HEIGHT;
      PIXEL_RATIO = state.PIXEL_RATIO;
      SF = state.SF;
      nodes_delaunay = state.nodes_delaunay;
      delaunay = state.delaunay;
      draw();
    };

    handleResize(canvases, contexts, config, state, data, {
      setDelaunay,
      interactionState,
      draw: drawWithUpdatedState,
    });

    WIDTH = state.WIDTH;
    HEIGHT = state.HEIGHT;
    PIXEL_RATIO = state.PIXEL_RATIO;
    SF = state.SF;
    nodes_delaunay = state.nodes_delaunay;
    delaunay = state.delaunay;

    console.log("chart.resize() completed", {
      WIDTH,
      HEIGHT,
      SF,
      nodesCount: nodes.length,
    });
  };

  function applyFiltersInternal(): void {
    if (!originalRepos || !originalLinks || !originalContributors) {
      console.error("applyFilters(): Original data not initialized");
      return;
    }

    visibleRepos = JSON.parse(JSON.stringify(originalRepos));

    if (activeFilters.organizations.length > 0) {
      visibleRepos = visibleRepos.filter((repo) => {
        const owner = repo.repo!.substring(0, repo.repo!.indexOf("/"));
        return hasOrganization(activeFilters, owner);
      });
    }

    if (activeFilters.starsMin !== null) {
      visibleRepos = visibleRepos.filter(
        (repo) => +(repo.repo_stars ?? 0) >= activeFilters.starsMin!
      );
    }

    if (activeFilters.forksMin !== null) {
      visibleRepos = visibleRepos.filter(
        (repo) => +(repo.repo_forks ?? 0) >= activeFilters.forksMin!
      );
    }

    const visibleRepoNames = new Set(visibleRepos.map((r) => r.repo));

    visibleLinks = (originalLinks as d3.DSVRowString<string>[])
      .filter((link) => visibleRepoNames.has(link.repo))
      .map((link) => JSON.parse(JSON.stringify(link)));

    const visibleDisplayNames = new Set(
      visibleLinks.map((link) => link.author_name)
    );

    visibleContributors = (originalContributors as d3.DSVRowString<string>[])
      .filter((contributor) =>
        visibleDisplayNames.has(contributor.author_name)
      )
      .map((c) => JSON.parse(JSON.stringify(c)));

    const visibleContributorNames = new Set(
      visibleContributors.map((c) => c.author_name)
    );

    visibleLinks = visibleLinks.filter((link) => {
      return visibleContributorNames.has(link.author_name);
    });

    contributors = visibleContributors;
    repos = visibleRepos;
    links = visibleLinks as any;
  }

  function drawNodeWrapper(
    ctx: CanvasRenderingContext2D,
    sf: number,
    d: VisualizationNode
  ): void {
    const config = { COLOR_BACKGROUND, max };
    drawNode(ctx, sf, d, config, interactionState);
  }

  function drawNodeArcWrapper(
    ctx: CanvasRenderingContext2D,
    sf: number,
    d: VisualizationNode
  ): void {
    drawNodeArc(ctx, sf, d, interactionState, COLOR_CONTRIBUTOR, null);
  }

  function drawHoverRingWrapper(
    ctx: CanvasRenderingContext2D,
    d: VisualizationNode
  ): void {
    drawHoverRing(ctx, d, SF, null);
  }

  function timeRangeArcWrapper(
    ctx: CanvasRenderingContext2D,
    sf: number,
    d: VisualizationNode,
    repo: VisualizationNode,
    link: LinkData,
    COL: string = COLOR_REPO_MAIN
  ): void {
    timeRangeArc(ctx, sf, d, repo, link, COL, null);
  }

  function drawHatchPatternWrapper(
    ctx: CanvasRenderingContext2D,
    radius: number,
    angle: number,
    d: VisualizationNode
  ): void {
    drawHatchPattern(ctx, radius, angle, SF, d.color, sin);
  }

  function drawLinkWrapper(
    ctx: CanvasRenderingContext2D,
    sf: number,
    l: LinkData
  ): void {
    const config = { COLOR_LINK };
    drawLink(
      ctx,
      sf,
      l,
      config,
      interactionState,
      calculateLinkGradient,
      calculateEdgeCenters,
      scale_link_width
    );
  }

  function sq(x: number): number {
    return x * x;
  }

  function calculateEdgeCenters(
    l: LinkData,
    size: number = 2,
    sign: boolean = true
  ): void {
    const source = l.source as VisualizationNode;
    const target = l.target as VisualizationNode;
    l.r =
      sqrt(sq(target.x - source.x) + sq(target.y - source.y)) * size;
    const centers = findCenters(
      l.r!,
      { x: source.x, y: source.y },
      { x: target.x, y: target.y }
    );
    l.sign = sign;
    l.center = centers ? (l.sign ? centers.c2 : centers.c1) : undefined;

    function findCenters(
      r: number,
      p1: { x: number; y: number },
      p2: { x: number; y: number }
    ): { c1: { x: number; y: number }; c2: { x: number; y: number } } | null {
      const pm = { x: 0.5 * (p1.x + p2.x), y: 0.5 * (p1.y + p2.y) };
      let perpABdx = -(p2.y - p1.y);
      let perpABdy = p2.x - p1.x;
      const norm = sqrt(sq(perpABdx) + sq(perpABdy));
      perpABdx /= norm;
      perpABdy /= norm;
      const dpmp1 = sqrt(sq(pm.x - p1.x) + sq(pm.y - p1.y));
      const sinVal = dpmp1 / r;
      if (sinVal < -1 || sinVal > 1) return null;
      const cosVal = sqrt(1 - sq(sinVal));
      const d = r * cosVal;
      const res1 = { x: pm.x + perpABdx * d, y: pm.y + perpABdy * d };
      const res2 = { x: pm.x - perpABdx * d, y: pm.y - perpABdy * d };
      return { c1: res1, c2: res2 };
    }
  }

  function calculateLinkGradient(
    ctx: CanvasRenderingContext2D,
    l: LinkData
  ): void {
    const source = l.source as VisualizationNode;
    const target = l.target as VisualizationNode;

    const scale_alpha = d3
      .scaleLinear()
      .domain([300, 800])
      .range([0.5, 0.2])
      .clamp(true);

    let alpha: number;
    if (interactionState.hoverActive)
      alpha = (target as any).special_type ? 0.3 : 0.7;
    else
      alpha = (target as any).special_type ? 0.15 : scale_alpha(links.length);

    if (target.type === "owner" && target.degree > 5) {
      const scale_density = d3
        .scaleLinear()
        .domain([5, 15, 40])
        .range([1, 0.5, 0.25])
        .clamp(true);
      alpha *= scale_density(target.degree);
    }

    createGradient(l, alpha);

    function createGradient(l: LinkData, alpha: number): void {
      const source = l.source as VisualizationNode;
      const target = l.target as VisualizationNode;

      const colSource = d3.rgb(source.color);
      const color_rgb_source = `rgba(${colSource.r},${colSource.g},${colSource.b},${alpha})`;
      const colTarget = d3.rgb(target.color);
      const color_rgb_target = `rgba(${colTarget.r},${colTarget.g},${colTarget.b},${alpha})`;

      if (
        source &&
        target &&
        typeof source.x === "number" &&
        typeof source.y === "number" &&
        typeof target.x === "number" &&
        typeof target.y === "number" &&
        isFinite(source.x) &&
        isFinite(source.y) &&
        isFinite(target.x) &&
        isFinite(target.y)
      ) {
        try {
          const gradient = ctx.createLinearGradient(
            source.x * SF,
            source.y * SF,
            target.x * SF,
            target.y * SF
          );

          const dist = sqrt(
            sq(target.x - source.x) + sq(target.y - source.y)
          );
          const perc = source.r / dist;
          gradient.addColorStop(perc, color_rgb_source);
          gradient.addColorStop(1, color_rgb_target);
          l.gradient = gradient;
        } catch (e) {
          if (
            localStorage.getItem("debug-contributor-network") === "true"
          ) {
            console.warn("Gradient creation error:", e, { link: l, sf: SF });
          }
          l.gradient = COLOR_LINK;
        }
      } else {
        l.gradient = COLOR_LINK;
      }
    }
  }

  function setupHover(): void {
    const config = {
      PIXEL_RATIO,
      WIDTH,
      HEIGHT,
      SF,
      RADIUS_CONTRIBUTOR,
      CONTRIBUTOR_RING_WIDTH,
      sqrt,
    };
    const delaunayData: DelaunayDataProxy = {
      get delaunay() {
        return delaunay;
      },
      set delaunay(val) {
        delaunay = val;
      },
      get nodesDelaunay() {
        return nodes_delaunay;
      },
      set nodesDelaunay(val) {
        nodes_delaunay = val;
      },
    };

    setupHoverInteraction({
      canvasSelector: "#canvas-hover",
      config,
      delaunayData,
      interactionState,
      canvas,
      contextHover: context_hover,
      setHovered,
      clearHover,
      drawHoverState,
      zoomState,
    });
  }

  function drawHoverState(
    ctx: CanvasRenderingContext2D,
    d: VisualizationNode,
    DO_TOOLTIP: boolean = true
  ): void {
    ctx.save();

    if ((d as any).neighbor_links === undefined) {
      (d as any).neighbor_links = links.filter(
        (l) =>
          (l.source as VisualizationNode).id === d.id ||
          (l.target as VisualizationNode).id === d.id
      );
    }

    if (d.neighbors === undefined) {
      d.neighbors = nodes.filter((n) => {
        return links.find(
          (l) =>
            ((l.source as VisualizationNode).id === d.id &&
              (l.target as VisualizationNode).id === n.id) ||
            ((l.target as VisualizationNode).id === d.id &&
              (l.source as VisualizationNode).id === n.id)
        );
      });

      if (d.type === "contributor" || d.type === "repo") {
        d.neighbors.forEach((n) => {
          if (n && n.type === "owner" && d.data && (d.data as any).links_original) {
            (d.data as any).links_original.forEach((l: any) => {
              if (l.owner === n.id) {
                let node: VisualizationNode | undefined;
                let link: LinkData | undefined;
                if (d.type === "contributor") {
                  node = nodes.find((r) => r.id === l.repo);
                  if (!node) return;
                  link = links.find(
                    (lnk) =>
                      (lnk.source as VisualizationNode).id === n.id &&
                      (lnk.target as VisualizationNode).id === node!.id
                  );
                } else if (d.type === "repo") {
                  node = nodes.find((r) => r.id === l.contributor_name);
                  if (!node) return;
                  link = links.find(
                    (lnk) =>
                      (lnk.source as VisualizationNode).id === node!.id &&
                      (lnk.target as VisualizationNode).id === n.id
                  );
                }

                if (node) {
                  d.neighbors!.push(node);
                  if (link) (d as any).neighbor_links.push(link);
                }
              }
            });
          }
        });
      }
    }

    if ((d as any).neighbor_links) {
      (d as any).neighbor_links.forEach((l: LinkData) => {
        if (l && l.source && l.target) drawLinkWrapper(ctx, SF, l);
      });
    }

    if (d.neighbors) {
      d.neighbors.forEach((n) => {
        if (n) drawNodeArcWrapper(ctx, SF, n);
      });
      d.neighbors.forEach((n) => {
        if (n) drawNodeWrapper(ctx, SF, n);
      });
      d.neighbors.forEach((n) => {
        if (n && (n as any).node_central) drawNodeLabelWrapper(ctx, n);
      });
    }

    drawNodeWrapper(ctx, SF, d);
    drawHoverRingWrapper(ctx, d);

    if ((d as any).node_central && d.type === "contributor")
      drawNodeLabelWrapper(ctx, d);

    if (DO_TOOLTIP) drawTooltipWrapper(ctx, d);

    ctx.restore();
  }

  function setupClick(): void {
    const config = {
      PIXEL_RATIO,
      WIDTH,
      HEIGHT,
      SF,
      RADIUS_CONTRIBUTOR,
      CONTRIBUTOR_RING_WIDTH,
      sqrt,
    };
    const delaunayData: DelaunayDataProxy = {
      get delaunay() {
        return delaunay;
      },
      set delaunay(val) {
        delaunay = val;
      },
      get nodesDelaunay() {
        return nodes_delaunay;
      },
      set nodesDelaunay(val) {
        nodes_delaunay = val;
      },
    };

    setupClickInteraction({
      canvasSelector: "#canvas-hover",
      config,
      delaunayData,
      interactionState,
      canvas,
      contextClick: context_click,
      contextHover: context_hover,
      nodes,
      setClicked,
      clearClick,
      clearHover,
      setDelaunay,
      drawHoverState,
      zoomState,
      ZOOM_CLICK_SUPPRESS_MS,
    });
  }

  function setupZoom(): void {
    setupZoomModule({
      canvasSelector: "#canvas-hover",
      state: zoomState,
      redrawAll,
      ZOOM_CLICK_SUPPRESS_MS,
    });
  }

  function drawTooltipWrapper(
    ctx: CanvasRenderingContext2D,
    d: VisualizationNode
  ): void {
    const config = {
      SF,
      COLOR_BACKGROUND,
      COLOR_TEXT,
      COLOR_CONTRIBUTOR,
      COLOR_REPO,
      COLOR_OWNER,
      min,
    };
    drawTooltipModule(
      ctx,
      d,
      config,
      interactionState,
      null,
      formatDate,
      formatDateExact,
      formatDigit
    );
  }

  function drawNodeLabelWrapper(
    ctx: CanvasRenderingContext2D,
    d: VisualizationNode,
    DO_CENTRAL_OUTSIDE: boolean = false
  ): void {
    const config = {
      SF,
      COLOR_TEXT,
      COLOR_BACKGROUND,
      COLOR_REPO_MAIN,
      PI,
    };
    drawNodeLabel(ctx, d, config, null, DO_CENTRAL_OUTSIDE);
  }

  chart.width = function (value?: number): any {
    if (value === undefined) return width;
    width = value;
    return chart;
  };

  chart.height = function (value?: number): any {
    if (value === undefined) return height;
    height = value;
    return chart;
  };

  chart.rebuild = function (): ChartFunction {
    nodes = [];
    links = [];
    nodes_central = [];

    clearAll(interactionState);
    clearDelaunay(interactionState);

    nodes_delaunay = [];
    delaunay = null;

    applyFiltersInternal();

    const prepared = prepareData(
      { contributors, repos, links: links as any },
      {
        COLOR_CONTRIBUTOR,
        COLOR_REPO,
        COLOR_OWNER,
        MAX_CONTRIBUTOR_WIDTH,
        context,
        isValidContributor,
        setContributorFont,
        getLines,
      },
      {
        scale_repo_radius,
        scale_owner_radius,
        scale_contributor_radius,
        scale_link_width,
      }
    );

    if (!prepared || typeof prepared !== "object") {
      console.error("rebuild: prepareData returned invalid result");
      return chart as ChartFunction;
    }
    if (!Array.isArray(prepared.nodes) || prepared.nodes.length === 0) {
      console.error(
        "rebuild: prepareData returned empty nodes - filters may be too restrictive"
      );
      return chart as ChartFunction;
    }

    nodes = prepared.nodes;
    nodes_central = prepared.nodes_central;
    links = prepared.links;

    runOwnerSimulation(nodes, links);
    runContributorSimulation(nodes, links);
    const positioningResult = positionContributorNodes(
      { nodes, contributors },
      { CONTRIBUTOR_PADDING }
    );
    RADIUS_CONTRIBUTOR = positioningResult.RADIUS_CONTRIBUTOR;
    CONTRIBUTOR_RING_WIDTH = positioningResult.CONTRIBUTOR_RING_WIDTH;

    SF = calculateScaleFactor(
      WIDTH,
      DEFAULT_SIZE,
      RADIUS_CONTRIBUTOR,
      CONTRIBUTOR_RING_WIDTH
    );

    nodes_central = runCollaborationSimulation(nodes, links, {
      context,
      scale_link_distance,
      RADIUS_CONTRIBUTOR,
      INNER_RADIUS_FACTOR,
    });
    links = resolveLinkReferences(links, nodes);

    const unpositionedNodes = nodes.filter((n) => n.x === 0 && n.y === 0);

    if (unpositionedNodes.length > 0) {
      const contributorCount = nodes.filter(
        (n) => n.type === "contributor"
      ).length;
      const repoCount = nodes.filter((n) => n.type === "repo").length;

      let contributorIdx = 0;
      let repoIdx = 0;

      unpositionedNodes.forEach((node) => {
        if (node.type === "contributor") {
          const angle =
            (contributorIdx / Math.max(1, contributorCount)) * Math.PI * 2;
          const radius = 250;
          node.x = Math.cos(angle) * radius;
          node.y = Math.sin(angle) * radius;
          if (!node.r) node.r = 6;
          contributorIdx++;
        } else if (node.type === "repo") {
          const angle =
            (repoIdx / Math.max(1, repoCount)) * Math.PI * 2;
          const radius = 150 + Math.random() * 50;
          node.x = Math.cos(angle) * radius;
          node.y = Math.sin(angle) * radius;
          if (!node.r) node.r = 8;
          repoIdx++;
        } else if (node.type === "owner") {
          const angle = (repoIdx / 5) * Math.PI * 2;
          const radius = 50;
          node.x = Math.cos(angle) * radius;
          node.y = Math.sin(angle) * radius;
          if (!node.r) node.r = 15;
        }
      });
    }

    links.forEach((link) => {
      const source = link.source as VisualizationNode;
      const target = link.target as VisualizationNode;
      if (source && target) {
        if (
          typeof source.x !== "number" ||
          typeof source.y !== "number" ||
          !isFinite(source.x) ||
          !isFinite(source.y)
        ) {
          source.x = 0;
          source.y = 0;
        }
        if (
          typeof target.x !== "number" ||
          typeof target.y !== "number" ||
          !isFinite(target.x) ||
          !isFinite(target.y)
        ) {
          target.x = 0;
          target.y = 0;
        }
      }
    });

    chart.resize();

    setupHover();
    setupClick();

    return chart as ChartFunction;
  };

  chart.setFilter = function (
    organizationName: string,
    enabled: boolean
  ): ChartFunction {
    if (enabled) {
      addOrganization(activeFilters, organizationName);
    } else {
      removeOrganization(activeFilters, organizationName);
    }
    chart.rebuild();
    return chart as ChartFunction;
  };

  chart.setRepoFilter = function (
    metric: string,
    value: number | null
  ): ChartFunction {
    setMetricFilter(activeFilters, metric as MetricKey, value);
    chart.rebuild();
    return chart as ChartFunction;
  };

  chart.getActiveFilters = function (): FilterState {
    return { ...activeFilters };
  };

  chart.getNodes = function (): VisualizationNode[] {
    return nodes;
  };

  chart.getLinks = function (): LinkData[] {
    return links;
  };

  chart.getDebugState = function (): Record<string, unknown> {
    const validLinks = links.filter(
      (l) =>
        l.source &&
        l.target &&
        typeof l.source === "object" &&
        typeof l.target === "object"
    );

    const drawableLinks = validLinks.filter(
      (l) =>
        l.source &&
        l.target &&
        typeof (l.source as VisualizationNode).x === "number" &&
        typeof (l.source as VisualizationNode).y === "number" &&
        typeof (l.target as VisualizationNode).x === "number" &&
        typeof (l.target as VisualizationNode).y === "number" &&
        isFinite((l.source as VisualizationNode).x) &&
        isFinite((l.source as VisualizationNode).y) &&
        isFinite((l.target as VisualizationNode).x) &&
        isFinite((l.target as VisualizationNode).y)
    );

    return {
      nodesCount: nodes.length,
      linksCount: links.length,
      nodeTypes: nodes.reduce(
        (acc, n) => {
          acc[n.type] = (acc[n.type] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      ),
      validLinks: validLinks.length,
      linksWithValidCoordinates: drawableLinks.length,
      activeFilters: { ...activeFilters },
    };
  };

  return chart as unknown as ChartFunction;
};
