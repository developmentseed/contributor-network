import type { FilterState } from "../types";

export type MetricKey = "starsMin" | "forksMin" | "orgCommitRatioMin";

export function createFilterState(): FilterState {
  return {
    organizations: [],
    starsMin: null,
    forksMin: null,
    orgCommitRatioMin: null,
  };
}

export function addOrganization(state: FilterState, org: string): FilterState {
  if (!state.organizations.includes(org)) {
    state.organizations.push(org);
  }
  return state;
}

export function removeOrganization(
  state: FilterState,
  org: string,
): FilterState {
  state.organizations = state.organizations.filter((o) => o !== org);
  return state;
}

export function setMetricFilter(
  state: FilterState,
  metric: MetricKey,
  value: number | null,
): FilterState {
  if (metric === "starsMin" || metric === "forksMin" || metric === "orgCommitRatioMin") {
    state[metric] = value;
  }
  return state;
}

export function clearFilters(state: FilterState): FilterState {
  state.organizations = [];
  state.starsMin = null;
  state.forksMin = null;
  state.orgCommitRatioMin = null;
  return state;
}

export function hasOrganization(state: FilterState, org: string): boolean {
  return state.organizations.includes(org);
}

export function hasActiveFilters(state: FilterState): boolean {
  return (
    state.organizations.length > 0 ||
    state.starsMin !== null ||
    state.forksMin !== null ||
    state.orgCommitRatioMin !== null
  );
}
