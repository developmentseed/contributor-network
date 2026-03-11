import * as d3 from 'd3';
import { findNode as findNodeAtPosition } from './findNode';
import { shouldSuppressClick, drawWithZoomTransform } from './zoom';
import type {
  VisualizationConfig,
  DelaunayData,
  InteractionState,
  ZoomState,
  VisualizationNode,
} from '../types';

export interface SetupClickOptions {
  canvasSelector: string;
  config: VisualizationConfig;
  delaunayData: DelaunayData;
  interactionState: InteractionState;
  canvas: HTMLCanvasElement;
  contextClick: CanvasRenderingContext2D;
  contextHover: CanvasRenderingContext2D;
  nodes: VisualizationNode[];
  setClicked: (state: InteractionState, node: VisualizationNode) => void;
  clearClick: (state: InteractionState) => void;
  clearHover: (state: InteractionState) => void;
  setDelaunay: (
    state: InteractionState,
    delaunay: d3.Delaunay<[number, number]>,
    nodesDelaunay: VisualizationNode[],
  ) => void;
  drawHoverState: (
    context: CanvasRenderingContext2D,
    node: VisualizationNode,
    showTooltip?: boolean,
  ) => void;
  zoomState?: ZoomState | null;
  ZOOM_CLICK_SUPPRESS_MS?: number;
}

/**
 * Sets up click interaction handlers on the canvas
 * @param options - Configuration options for click behavior
 */
export function setupClick(options: SetupClickOptions): void {
  const {
    canvasSelector,
    config,
    delaunayData,
    interactionState,
    canvas,
    contextClick,
    contextHover,
    nodes,
    setClicked,
    clearClick,
    clearHover,
    setDelaunay,
    drawHoverState,
  } = options;
  const { WIDTH, HEIGHT } = config;

  const element = document.querySelector(canvasSelector) as Element;
  d3.select(element).on('click', function (this: Element, event: MouseEvent) {
    if (options.zoomState && shouldSuppressClick(options.zoomState, options.ZOOM_CLICK_SUPPRESS_MS)) {
      return;
    }

    let [mx, my] = d3.pointer(event, this);
    const zoomTransform = options.zoomState?.zoomTransform || null;
    const [d, FOUND] = findNodeAtPosition(
      mx,
      my,
      config,
      delaunayData,
      interactionState,
      zoomTransform,
    );

    contextClick.clearRect(0, 0, WIDTH, HEIGHT);

    if (FOUND && d) {
      setClicked(interactionState, d);

      delaunayData.nodesDelaunay = d.neighbors ? [...d.neighbors, d] : nodes;
      delaunayData.delaunay = d3.Delaunay.from(
        delaunayData.nodesDelaunay.map((n) => [n.x, n.y] as [number, number]),
      );
      setDelaunay(interactionState, delaunayData.delaunay, delaunayData.nodesDelaunay);

      drawWithZoomTransform(contextClick, config, options.zoomState ?? null, () => {
        drawHoverState(contextClick, d, false);
      });
      contextHover.clearRect(0, 0, WIDTH, HEIGHT);
    } else {
      clearClick(interactionState);
      clearHover(interactionState);

      delaunayData.nodesDelaunay = nodes;
      delaunayData.delaunay = d3.Delaunay.from(
        delaunayData.nodesDelaunay.map((n) => [n.x, n.y] as [number, number]),
      );
      setDelaunay(interactionState, delaunayData.delaunay, delaunayData.nodesDelaunay);

      canvas.style.opacity = '1';
    }
  });
}
