import type {
  VisualizationConfig,
  DelaunayData,
  InteractionState,
  VisualizationNode,
} from '../types';
import { ZoomTransform } from 'd3';

/**
 * Finds the node at the given mouse coordinates using Delaunay triangulation
 * @param mx - Mouse x coordinate (in canvas pixels)
 * @param my - Mouse y coordinate (in canvas pixels)
 * @param config - Configuration object
 * @param delaunayData - Delaunay triangulation data
 * @param interactionState - Interaction state object
 * @param zoomTransform - Optional D3 zoom transform object (defaults to identity)
 * @returns [node, found] - The found node (or null) and whether it was found
 */
export function findNode(
  mx: number,
  my: number,
  config: VisualizationConfig,
  delaunayData: DelaunayData,
  interactionState: InteractionState,
  zoomTransform: ZoomTransform | null = null,
): [VisualizationNode | null, boolean] {
  const { PIXEL_RATIO, WIDTH, HEIGHT, SF, RADIUS_CONTRIBUTOR, CONTRIBUTOR_RING_WIDTH, sqrt } =
    config;
  const { delaunay, nodesDelaunay } = delaunayData;

  if (zoomTransform && zoomTransform.k !== 1) {
    const mxDevice = mx * PIXEL_RATIO;
    const myDevice = my * PIXEL_RATIO;
    mx = ((mxDevice - zoomTransform.x * PIXEL_RATIO) / zoomTransform.k - WIDTH / 2) / SF;
    my = ((myDevice - zoomTransform.y * PIXEL_RATIO) / zoomTransform.k - HEIGHT / 2) / SF;
  } else {
    mx = (mx * PIXEL_RATIO - WIDTH / 2) / SF;
    my = (my * PIXEL_RATIO - HEIGHT / 2) / SF;
  }

  const MAX_RADIUS = RADIUS_CONTRIBUTOR + CONTRIBUTOR_RING_WIDTH + 200;
  const distFromCenter = sqrt(mx * mx + my * my);
  if (distFromCenter > MAX_RADIUS) {
    return [null, false];
  }

  const point = delaunay.find(mx, my);
  const d = nodesDelaunay[point];

  if (!d) {
    return [null, false];
  }

  const dist = sqrt((d.x - mx) ** 2 + (d.y - my) ** 2);
  const FOUND = dist < d.r + (interactionState.clickActive ? 10 : 50);

  return [d, FOUND];
}
