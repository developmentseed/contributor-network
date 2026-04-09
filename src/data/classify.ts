import type { VisualizationNode, LinkData, FilterState, RepoData } from '../types';
import { hasActiveFilters } from '../state/filterState';

/**
 * Classifies nodes and links as filtered-in or filtered-out based on current
 * filter state. Mutates `filteredOut` on each node/link in-place.
 *
 * When no filters are active, all nodes/links are marked filteredOut=false.
 */
export function classifyByFilters(
  nodes: VisualizationNode[],
  links: LinkData[],
  filterState: FilterState,
): void {
  if (!hasActiveFilters(filterState)) {
    for (const node of nodes) node.filteredOut = false;
    for (const link of links) link.filteredOut = false;
    return;
  }

  // Step 1: Classify repos
  const visibleRepoIds = new Set<string>();
  for (const node of nodes) {
    if (node.type !== 'repo') continue;
    const repo = node.data as RepoData;
    let visible = true;

    if (filterState.organizations.length > 0) {
      visible = visible && filterState.organizations.includes(repo.owner);
    }
    if (filterState.starsMin !== null) {
      visible = visible && (repo.stars ?? 0) >= filterState.starsMin;
    }
    if (filterState.forksMin !== null) {
      visible = visible && (repo.forks ?? 0) >= filterState.forksMin;
    }
    if (filterState.orgCommitRatioMin !== null) {
      const total = repo.totalCommits ?? 0;
      visible = visible && total > 0 && (repo.orgCommits ?? 0) / total >= filterState.orgCommitRatioMin;
    }

    node.filteredOut = !visible;
    if (visible) visibleRepoIds.add(node.id);
  }

  // Step 2: Classify owners (needed before link classification)
  const visibleOwnerIds = new Set<string>();
  for (const node of nodes) {
    if (node.type !== 'owner') continue;
    const hasVisibleRepo = nodes.some(
      n => n.type === 'repo' && !n.filteredOut && (n.data as RepoData).owner === node.id,
    );
    node.filteredOut = !hasVisibleRepo;
    if (hasVisibleRepo) visibleOwnerIds.add(node.id);
  }

  // Step 3: Classify links and determine visible contributors
  // Links target repos directly, or go through owners (contributor→owner, owner→repo).
  // A link is visible if its target is a visible repo OR a visible owner.
  const visibleContributorIds = new Set<string>();
  for (const link of links) {
    const targetId = typeof link.target === 'string' ? link.target : link.target.id;
    const visible =
      visibleRepoIds.has(targetId) ||
      visibleOwnerIds.has(targetId) ||
      (link.repo ? visibleRepoIds.has(link.repo) : false);
    link.filteredOut = !visible;
    if (!link.filteredOut) {
      const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
      visibleContributorIds.add(sourceId);
      if (link.author_name) visibleContributorIds.add(link.author_name);
    }
  }

  // Step 4: Classify contributors
  for (const node of nodes) {
    if (node.type === 'contributor') {
      node.filteredOut = !visibleContributorIds.has(node.id);
    }
  }
}
