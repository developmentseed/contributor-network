export type NodeType = "contributor" | "repo" | "owner";

export interface ContributorData {
  contributor_name: string;
  author_name: string;
  color: string;
  contributor_lines: string[];
  contributor_max_width: number;
  links_original: LinkData[];
  repos: RepoData[];
  total_commits: number;
  index: number;
}

export interface RepoData {
  repo: string;
  name: string;
  owner: string;
  color: string;
  forks: number;
  stars: number;
  watchers: number;
  openIssues: number;
  license: string | null;
  topics: string[];
  hasDiscussions: boolean;
  archived: boolean;
  totalContributors: number;
  orgContributors: number;
  externalContributors: number;
  communityRatio: number;
  totalCommits?: number;
  orgCommits?: number;
  createdAt: Date;
  updatedAt: Date;
  languages: string[];
  multi_repo_owner: boolean;
  links_original: LinkData[];
  contributors: ContributorData[];
  index: number;
  // Raw CSV fields (before processing)
  repo_forks?: string;
  repo_stars?: string;
  repo_watchers?: string;
  repo_open_issues?: string;
  repo_license?: string;
  repo_topics?: string;
  repo_has_discussions?: string | boolean;
  repo_archived?: string | boolean;
  repo_total_contributors?: string;
  repo_total_commits?: string;
  repo_devseed_contributors?: string;
  repo_external_contributors?: string;
  repo_community_ratio?: string;
  repo_createdAt?: string;
  repo_updatedAt?: string;
  repo_languages: string;
}

export interface OwnerData {
  owner: string;
  repos: (string | RepoData)[];
  color: string;
  stars: number;
  forks: number;
  single_contributor: boolean;
}

export interface LinkData {
  source: string | VisualizationNode;
  target: string | VisualizationNode;
  owner?: string;
  repo?: string;
  name?: string;
  contributor_name?: string;
  author_name?: string;
  commit_count: number;
  commit_sec_min: Date | string;
  commit_sec_max: Date | string;
  gradient?: CanvasGradient | string;
  center?: { x: number; y: number };
  r?: number;
  sign?: boolean;
  to_remove?: boolean;
  filteredOut?: boolean;
}

export interface VisualizationNode {
  id: string;
  type: NodeType;
  label: string;
  data: ContributorData | RepoData | OwnerData;
  index: number;
  degree: number;
  x: number;
  y: number;
  r: number;
  color: string;
  neighbors?: VisualizationNode[];

  // Set by d3 force simulations
  fx?: number | null;
  fy?: number | null;

  // Set by ownerSimulation / contributorSimulation
  max_radius?: number;
  connected_node_cloud?: VisualizationNode[];
  connected_single_repo?: VisualizationNode[];
  node_central?: boolean;
  bbox?: [[number, number], [number, number]];
  contributor_angle?: number;
  neighbor_links?: LinkData[];
  filteredOut?: boolean;
}

export interface InteractionState {
  hoverActive: boolean;
  hoveredNode: VisualizationNode | null;
  clickActive: boolean;
  clickedNode: VisualizationNode | null;
  delaunay: d3.Delaunay<[number, number]> | null;
  nodesDelaunay: VisualizationNode[] | null;
}

export interface FilterState {
  organizations: string[];
  starsMin: number | null;
  forksMin: number | null;
}

export interface DelaunayData {
  delaunay: d3.Delaunay<[number, number]>;
  nodesDelaunay: VisualizationNode[];
}

export interface ZoomState {
  zoomTransform: d3.ZoomTransform;
  zoomPanning: boolean;
  zoomLastInteraction: number;
  zoomMoved: boolean;
  zoomMovedAt: number;
  zoomStartTransform: d3.ZoomTransform;
}

export interface VisualizationConfig {
  PIXEL_RATIO: number;
  WIDTH: number;
  HEIGHT: number;
  SF: number;
  RADIUS_CONTRIBUTOR: number;
  CONTRIBUTOR_RING_WIDTH: number;
  sqrt: (x: number) => number;
}

export interface PreparedData {
  nodes: VisualizationNode[];
  owners: OwnerData[];
  nodes_central: VisualizationNode[];
  links: LinkData[];
}
