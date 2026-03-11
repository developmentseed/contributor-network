/**
 * Filter Module
 *
 * Pure functions for filtering contributor network data.
 * All functions are side-effect free and return new arrays (immutable).
 *
 * @module data/filter
 */

import type {
  RepoData,
  LinkData,
  ContributorData,
  FilterState,
} from "../types";

/**
 * Deep clone an object using JSON serialization.
 * Used to prevent D3's mutation of data objects.
 *
 * @param obj - Object to clone
 * @returns Deep cloned copy
 */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Extract the owner (organization) from a repo string.
 *
 * @param repoFullName - Full repo name (e.g., "developmentseed/titiler")
 * @returns Owner/organization name (e.g., "developmentseed")
 */
export function getRepoOwner(repoFullName: string): string {
  const slashIndex = repoFullName.indexOf("/");
  return slashIndex > 0
    ? repoFullName.substring(0, slashIndex)
    : repoFullName;
}

/**
 * Filter repositories by organization.
 *
 * @param repos - Array of repository objects with 'repo' property
 * @param organizations - Array of organization names to include
 * @param centralRepo - Optional central repo to always include
 * @returns Filtered repositories
 */
export function filterReposByOrganization(
  repos: RepoData[],
  organizations: string[],
  centralRepo: string | null = null,
): RepoData[] {
  if (!organizations || organizations.length === 0) {
    return repos;
  }

  return repos.filter((repo) => {
    if (centralRepo && repo.repo === centralRepo) {
      return true;
    }
    const owner = getRepoOwner(repo.repo);
    return organizations.includes(owner);
  });
}

/**
 * Filter repositories by minimum star count.
 *
 * @param repos - Array of repository objects with 'repo_stars' property
 * @param minStars - Minimum star count threshold
 * @returns Filtered repositories
 */
export function filterReposByStars(
  repos: RepoData[],
  minStars: number,
): RepoData[] {
  return repos.filter((repo) => +((repo as any).repo_stars ?? repo.stars ?? 0) >= minStars);
}

/**
 * Filter repositories by minimum fork count.
 *
 * @param repos - Array of repository objects with 'repo_forks' property
 * @param minForks - Minimum fork count threshold
 * @returns Filtered repositories
 */
export function filterReposByForks(
  repos: RepoData[],
  minForks: number,
): RepoData[] {
  return repos.filter((repo) => +((repo as any).repo_forks ?? repo.forks ?? 0) >= minForks);
}

/**
 * Filter links to only those pointing to visible repositories.
 *
 * @param links - Array of link objects with 'repo' property
 * @param visibleRepoNames - Set of visible repo names
 * @returns Filtered links
 */
export function filterLinksByRepos(
  links: LinkData[],
  visibleRepoNames: Set<string>,
): LinkData[] {
  return links.filter((link) => visibleRepoNames.has(link.repo!));
}

/**
 * Filter links to only those from visible contributors.
 *
 * @param links - Array of link objects with 'author_name' property
 * @param visibleContributorNames - Set of visible contributor names
 * @returns Filtered links
 */
export function filterLinksByContributors(
  links: LinkData[],
  visibleContributorNames: Set<string>,
): LinkData[] {
  return links.filter((link) =>
    visibleContributorNames.has(link.author_name!),
  );
}

/**
 * Filter contributors to only those with visible links.
 *
 * @param contributors - Array of contributor objects with 'author_name' property
 * @param visibleContributorNames - Set of contributor names that have visible links
 * @returns Filtered contributors
 */
export function filterContributorsByLinks(
  contributors: ContributorData[],
  visibleContributorNames: Set<string>,
): ContributorData[] {
  return contributors.filter((c) =>
    visibleContributorNames.has(c.author_name),
  );
}

interface OriginalData {
  contributors: ContributorData[];
  repos: RepoData[];
  links: LinkData[];
}

interface FilterOptions {
  centralRepo?: string | null;
  debug?: boolean;
}

/**
 * Apply all active filters to the dataset.
 * This is the main entry point for filtering.
 *
 * Returns deep clones of all data to prevent D3 mutations from affecting originals.
 *
 * @param originalData - Original data object with contributors, repos, and links
 * @param activeFilters - Active filter configuration
 * @param options - Additional options
 * @returns Filtered data with contributors, repos, and links
 */
export function applyFilters(
  originalData: OriginalData,
  activeFilters: FilterState,
  options: FilterOptions = {},
): OriginalData {
  const { contributors, repos, links } = originalData;
  const { centralRepo = null, debug = false } = options;

  if (!repos || !links || !contributors) {
    console.error("applyFilters(): Original data not initialized");
    return { contributors: [], repos: [], links: [] };
  }

  let visibleRepos = deepClone(repos);

  if (activeFilters.organizations && activeFilters.organizations.length > 0) {
    visibleRepos = filterReposByOrganization(
      visibleRepos,
      activeFilters.organizations,
      centralRepo,
    );
  }

  if (activeFilters.starsMin != null) {
    visibleRepos = filterReposByStars(visibleRepos, activeFilters.starsMin);
  }
  if (activeFilters.forksMin != null) {
    visibleRepos = filterReposByForks(visibleRepos, activeFilters.forksMin);
  }

  const visibleRepoNames = new Set(visibleRepos.map((r) => r.repo));

  let visibleLinks = filterLinksByRepos(links, visibleRepoNames).map(
    deepClone,
  );

  const visibleDisplayNames = new Set(
    visibleLinks.map((link) => link.author_name!),
  );

  const visibleContributors = filterContributorsByLinks(
    contributors,
    visibleDisplayNames,
  ).map(deepClone);

  const visibleContributorNames = new Set(
    visibleContributors.map((c) => c.author_name),
  );

  visibleLinks = filterLinksByContributors(visibleLinks, visibleContributorNames);

  if (debug) {
    console.debug("=== APPLY FILTERS ===");
    console.debug(
      `Filters applied: ${activeFilters.organizations?.join(", ") || "none"}`,
    );
    console.debug(
      `Data before: ${contributors.length} contributors, ${repos.length} repos, ${links.length} links`,
    );
    console.debug(
      `Data after: ${visibleContributors.length} contributors, ${visibleRepos.length} repos, ${visibleLinks.length} links`,
    );
  }

  return {
    contributors: visibleContributors,
    repos: visibleRepos,
    links: visibleLinks,
  };
}

interface FilterManager {
  getFilters(): FilterState;
  setOrganization(org: string, active: boolean): void;
  setMetricFilter(metric: "starsMin" | "forksMin", value: number | null): void;
  clearOrganizations(): void;
  clearAll(): void;
  hasActiveFilters(): boolean;
}

/**
 * Create a filter state manager.
 * Provides a simple API for managing filter state with callbacks.
 *
 * @param onChange - Callback when filters change
 * @returns Filter manager with get/set methods
 */
export function createFilterManager(
  onChange?: (filters: FilterState) => void,
): FilterManager {
  let activeFilters: FilterState = {
    organizations: [],
    starsMin: null,
    forksMin: null,
  };

  return {
    getFilters(): FilterState {
      return { ...activeFilters };
    },

    setOrganization(org: string, active: boolean): void {
      const orgs = new Set(activeFilters.organizations);

      if (active) {
        orgs.add(org);
      } else {
        orgs.delete(org);
      }

      activeFilters.organizations = Array.from(orgs);

      if (onChange) {
        onChange(this.getFilters());
      }
    },

    setMetricFilter(
      metric: "starsMin" | "forksMin",
      value: number | null,
    ): void {
      if (metric === "starsMin" || metric === "forksMin") {
        activeFilters[metric] = value;
      }

      if (onChange) {
        onChange(this.getFilters());
      }
    },

    clearOrganizations(): void {
      activeFilters.organizations = [];

      if (onChange) {
        onChange(this.getFilters());
      }
    },

    clearAll(): void {
      activeFilters.organizations = [];
      activeFilters.starsMin = null;
      activeFilters.forksMin = null;

      if (onChange) {
        onChange(this.getFilters());
      }
    },

    hasActiveFilters(): boolean {
      return (
        activeFilters.organizations.length > 0 ||
        activeFilters.starsMin !== null ||
        activeFilters.forksMin !== null
      );
    },
  };
}
