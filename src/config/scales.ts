import * as d3 from 'd3';

import { SIZES, LAYOUT } from './theme';
import type { RepoData, ContributorData, LinkData } from '../types';

export function createRepoRadiusScale(): d3.ScalePower<number, number> {
  return d3
    .scaleSqrt()
    .range([SIZES.repoRadius.min, SIZES.repoRadius.max]);
}

export function createOwnerRadiusScale(): d3.ScalePower<number, number> {
  return d3
    .scaleSqrt()
    .range([SIZES.ownerRadius.min, SIZES.ownerRadius.max]);
}

export function createContributorRadiusScale(): d3.ScalePower<number, number> {
  return d3
    .scaleSqrt()
    .range([SIZES.contributorRadius.min, SIZES.contributorRadius.max]);
}

export function createLinkDistanceScale(): d3.ScaleLinear<number, number> {
  return d3
    .scaleLinear()
    .domain(LAYOUT.linkDistanceDomain)
    .range([SIZES.linkDistance.min, SIZES.linkDistance.max]);
}

export function createLinkWidthScale(): d3.ScalePower<number, number> {
  return d3
    .scalePow()
    .exponent(LAYOUT.linkWidthExponent)
    .range([SIZES.linkWidth.min, SIZES.linkWidth.mid, SIZES.linkWidth.max]);
}

export interface VisualizationScales {
  repoRadius: d3.ScalePower<number, number>;
  contributorRadius: d3.ScalePower<number, number>;
  linkDistance: d3.ScaleLinear<number, number>;
  linkWidth: d3.ScalePower<number, number>;
}

export function createAllScales(): VisualizationScales {
  return {
    repoRadius: createRepoRadiusScale(),
    contributorRadius: createContributorRadiusScale(),
    linkDistance: createLinkDistanceScale(),
    linkWidth: createLinkWidthScale(),
  };
}

interface ScaleInputData {
  repos?: RepoData[];
  contributors?: ContributorData[];
  links?: LinkData[];
}

export function updateScaleDomains(
  scales: VisualizationScales,
  data: ScaleInputData,
): VisualizationScales {
  const { repos = [], contributors = [], links = [] } = data;

  if (repos.length > 0) {
    const repoMetric = repos.map((r) => r.stars || r.forks || 1);
    scales.repoRadius.domain([0, Math.max(...repoMetric)]);
  }

  if (contributors.length > 0) {
    const contributorMetric = contributors.map(
      (c) => c.total_commits || 1,
    );
    scales.contributorRadius.domain([0, Math.max(...contributorMetric)]);
  }

  if (links.length > 0) {
    const linkMetric = links.map((l) => l.commit_count || 1);
    scales.linkWidth.domain([0, Math.max(...linkMetric)]);
  }

  return scales;
}
