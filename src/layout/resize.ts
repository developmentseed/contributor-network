/**
 * Canvas resize handling
 * @module layout/resize
 */

import * as d3 from 'd3';
import { setDelaunay } from '../state/interactionState';
import type { VisualizationNode, InteractionState } from '../types';

/**
 * Sizes a canvas element and sets up its rendering context
 */
export function sizeCanvas(
  canvas: HTMLCanvasElement,
  context: CanvasRenderingContext2D,
  WIDTH: number,
  HEIGHT: number,
  width: number,
  height: number,
  PIXEL_RATIO: number,
): void {
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;

  context.lineJoin = "round";
  context.lineCap = "round";
}

/**
 * Calculates the scale factor based on width and outer ring radius
 */
export function calculateScaleFactor(
  WIDTH: number,
  DEFAULT_SIZE: number,
  RADIUS_CONTRIBUTOR: number,
  CONTRIBUTOR_RING_WIDTH: number,
): number {
  let SF = WIDTH / DEFAULT_SIZE;
  const OUTER_RING = RADIUS_CONTRIBUTOR + (CONTRIBUTOR_RING_WIDTH / 2) * 2;
  if (WIDTH / 2 < OUTER_RING * SF) SF = WIDTH / (2 * OUTER_RING);
  return SF;
}

export interface ResizeCanvases {
  canvas: HTMLCanvasElement;
  canvas_click: HTMLCanvasElement;
  canvas_hover: HTMLCanvasElement;
}

export interface ResizeContexts {
  context: CanvasRenderingContext2D;
  context_click: CanvasRenderingContext2D;
  context_hover: CanvasRenderingContext2D;
}

export interface ResizeConfig {
  width: number;
  height: number;
  DEFAULT_SIZE: number;
  RADIUS_CONTRIBUTOR: number;
  CONTRIBUTOR_RING_WIDTH: number;
  round: (x: number) => number;
}

export interface ResizeState {
  WIDTH: number;
  HEIGHT: number;
  PIXEL_RATIO: number;
  SF: number;
  nodes_delaunay: VisualizationNode[];
  delaunay: d3.Delaunay<[number, number]>;
}

export interface ResizeData {
  nodes: VisualizationNode[];
}

export interface ResizeOptions {
  setDelaunay: typeof setDelaunay;
  interactionState: InteractionState;
  draw: () => void;
}

/**
 * Handles canvas resize and updates Delaunay triangulation
 */
export function handleResize(
  canvases: ResizeCanvases,
  contexts: ResizeContexts,
  config: ResizeConfig,
  state: ResizeState,
  data: ResizeData,
  options: ResizeOptions,
): void {
  const { interactionState, draw } = options;
  const { width, height, DEFAULT_SIZE, RADIUS_CONTRIBUTOR, CONTRIBUTOR_RING_WIDTH, round } = config;
  const { nodes } = data;

  state.PIXEL_RATIO = Math.max(2, window.devicePixelRatio);

  state.WIDTH = round(width * state.PIXEL_RATIO);
  state.HEIGHT = round(height * state.PIXEL_RATIO);

  sizeCanvas(canvases.canvas, contexts.context, state.WIDTH, state.HEIGHT, width, height, state.PIXEL_RATIO);
  sizeCanvas(canvases.canvas_click, contexts.context_click, state.WIDTH, state.HEIGHT, width, height, state.PIXEL_RATIO);
  sizeCanvas(canvases.canvas_hover, contexts.context_hover, state.WIDTH, state.HEIGHT, width, height, state.PIXEL_RATIO);

  state.SF = state.WIDTH / DEFAULT_SIZE;
  const OUTER_RING = RADIUS_CONTRIBUTOR + (CONTRIBUTOR_RING_WIDTH / 2) * 2;
  if (state.WIDTH / 2 < OUTER_RING * state.SF) state.SF = state.WIDTH / (2 * OUTER_RING);

  state.nodes_delaunay = nodes;
  state.delaunay = d3.Delaunay.from(state.nodes_delaunay.map((d) => [d.x, d.y]));
  options.setDelaunay(interactionState, state.delaunay, state.nodes_delaunay);

  draw();
}
