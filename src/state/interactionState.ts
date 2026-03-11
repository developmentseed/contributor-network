import type { InteractionState, VisualizationNode } from "../types";

export function createInteractionState(): InteractionState {
  return {
    hoverActive: false,
    hoveredNode: null,
    clickActive: false,
    clickedNode: null,
    delaunay: null,
    nodesDelaunay: null,
  };
}

export function setHovered(
  state: InteractionState,
  node: VisualizationNode | null,
): InteractionState {
  state.hoverActive = !!node;
  state.hoveredNode = node;
  return state;
}

export function clearHover(state: InteractionState): InteractionState {
  state.hoverActive = false;
  state.hoveredNode = null;
  return state;
}

export function setClicked(
  state: InteractionState,
  node: VisualizationNode | null,
): InteractionState {
  state.clickActive = !!node;
  state.clickedNode = node;
  return state;
}

export function clearClick(state: InteractionState): InteractionState {
  state.clickActive = false;
  state.clickedNode = null;
  return state;
}

export function clearAll(state: InteractionState): InteractionState {
  state.hoverActive = false;
  state.hoveredNode = null;
  state.clickActive = false;
  state.clickedNode = null;
  return state;
}

export function setDelaunay(
  state: InteractionState,
  delaunay: d3.Delaunay<[number, number]>,
  nodesDelaunay: VisualizationNode[],
): InteractionState {
  state.delaunay = delaunay;
  state.nodesDelaunay = nodesDelaunay;
  return state;
}

export function clearDelaunay(state: InteractionState): InteractionState {
  state.delaunay = null;
  state.nodesDelaunay = null;
  return state;
}
