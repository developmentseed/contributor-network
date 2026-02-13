/**
 * Filter Module
 *
 * Pure functions for filtering contributor network data.
 * All functions are side-effect free and return new arrays (immutable).
 *
 * @module data/filter
 */

/**
 * Deep clone an object using JSON serialization.
 * Used to prevent D3's mutation of data objects.
 *
 * @param {Object|Array} obj - Object to clone
 * @returns {Object|Array} Deep cloned copy
 */
export function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Extract the owner (organization) from a repo string.
 *
 * @param {string} repoFullName - Full repo name (e.g., "developmentseed/titiler")
 * @returns {string} Owner/organization name (e.g., "developmentseed")
 */
export function getRepoOwner(repoFullName) {
  const slashIndex = repoFullName.indexOf('/');
  return slashIndex > 0 ? repoFullName.substring(0, slashIndex) : repoFullName;
}

/**
 * Filter repositories by organization.
 *
 * @param {Array} repos - Array of repository objects with 'repo' property
 * @param {string[]} organizations - Array of organization names to include
 * @param {string} [centralRepo] - Optional central repo to always include
 * @returns {Array} Filtered repositories
 */
export function filterReposByOrganization(repos, organizations, centralRepo = null) {
  if (!organizations || organizations.length === 0) {
    return repos;
  }

  return repos.filter(repo => {
    // Always include the central pseudo-repo
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
 * @param {Array} repos - Array of repository objects with 'repo_stars' property
 * @param {number} minStars - Minimum star count threshold
 * @returns {Array} Filtered repositories
 */
export function filterReposByStars(repos, minStars) {
  return repos.filter(repo => +repo.repo_stars >= minStars);
}

/**
 * Filter repositories by minimum fork count.
 *
 * @param {Array} repos - Array of repository objects with 'repo_forks' property
 * @param {number} minForks - Minimum fork count threshold
 * @returns {Array} Filtered repositories
 */
export function filterReposByForks(repos, minForks) {
  return repos.filter(repo => +repo.repo_forks >= minForks);
}

/**
 * Filter links to only those pointing to visible repositories.
 *
 * @param {Array} links - Array of link objects with 'repo' property
 * @param {Set<string>} visibleRepoNames - Set of visible repo names
 * @returns {Array} Filtered links
 */
export function filterLinksByRepos(links, visibleRepoNames) {
  return links.filter(link => visibleRepoNames.has(link.repo));
}

/**
 * Filter links to only those from visible contributors.
 *
 * @param {Array} links - Array of link objects with 'author_name' property
 * @param {Set<string>} visibleContributorNames - Set of visible contributor names
 * @returns {Array} Filtered links
 */
export function filterLinksByContributors(links, visibleContributorNames) {
  return links.filter(link => visibleContributorNames.has(link.author_name));
}

/**
 * Filter contributors to only those with visible links.
 *
 * @param {Array} contributors - Array of contributor objects with 'author_name' property
 * @param {Set<string>} visibleContributorNames - Set of contributor names that have visible links
 * @returns {Array} Filtered contributors
 */
export function filterContributorsByLinks(contributors, visibleContributorNames) {
  return contributors.filter(c => visibleContributorNames.has(c.author_name));
}

/**
 * Apply all active filters to the dataset.
 * This is the main entry point for filtering.
 *
 * Returns deep clones of all data to prevent D3 mutations from affecting originals.
 *
 * @param {Object} originalData - Original data object
 * @param {Array} originalData.contributors - Array of contributor objects
 * @param {Array} originalData.repos - Array of repository objects
 * @param {Array} originalData.links - Array of link objects
 * @param {Object} activeFilters - Active filter configuration
 * @param {string[]} [activeFilters.organizations] - Organizations to filter by
 * @param {Object} [options] - Additional options
 * @param {string} [options.centralRepo] - Central repo to always include
 * @param {boolean} [options.debug] - Enable debug logging
 * @returns {Object} Filtered data with { contributors, repos, links }
 */
export function applyFilters(originalData, activeFilters, options = {}) {
  const { contributors, repos, links } = originalData;
  const { centralRepo = null, debug = false } = options;

  // Guard against uninitialized data
  if (!repos || !links || !contributors) {
    console.error('applyFilters(): Original data not initialized');
    return { contributors: [], repos: [], links: [] };
  }

  // Start with deep clones to prevent mutation
  let visibleRepos = deepClone(repos);

  // Apply organization filter
  if (activeFilters.organizations && activeFilters.organizations.length > 0) {
    visibleRepos = filterReposByOrganization(visibleRepos, activeFilters.organizations, centralRepo);
  }

  // Apply metric filters
  if (activeFilters.starsMin != null) {
    visibleRepos = filterReposByStars(visibleRepos, activeFilters.starsMin);
  }
  if (activeFilters.forksMin != null) {
    visibleRepos = filterReposByForks(visibleRepos, activeFilters.forksMin);
  }

  // Build set of visible repo names for quick lookup
  const visibleRepoNames = new Set(visibleRepos.map(r => r.repo));

  // Filter links to visible repos (clone after filtering for efficiency)
  let visibleLinks = filterLinksByRepos(links, visibleRepoNames).map(deepClone);

  // Build set of visible contributor names from visible links
  const visibleDisplayNames = new Set(visibleLinks.map(link => link.author_name));

  // Filter contributors to those with visible links
  const visibleContributors = filterContributorsByLinks(contributors, visibleDisplayNames).map(deepClone);

  // Build set of visible contributor names for link re-filtering
  const visibleContributorNames = new Set(visibleContributors.map(c => c.author_name));

  // Re-filter links to only those where the contributor is also visible
  visibleLinks = filterLinksByContributors(visibleLinks, visibleContributorNames);

  // Debug logging
  if (debug) {
    console.debug('=== APPLY FILTERS ===');
    console.debug(`Filters applied: ${activeFilters.organizations?.join(', ') || 'none'}`);
    console.debug(`Data before: ${contributors.length} contributors, ${repos.length} repos, ${links.length} links`);
    console.debug(`Data after: ${visibleContributors.length} contributors, ${visibleRepos.length} repos, ${visibleLinks.length} links`);
  }

  return {
    contributors: visibleContributors,
    repos: visibleRepos,
    links: visibleLinks
  };
}

/**
 * Create a filter state manager.
 * Provides a simple API for managing filter state with callbacks.
 *
 * @param {Function} onChange - Callback when filters change
 * @returns {Object} Filter manager with get/set methods
 */
export function createFilterManager(onChange) {
  let activeFilters = {
    organizations: [],
    starsMin: null,
    forksMin: null
  };

  return {
    /**
     * Get current filter state
     * @returns {Object} Current active filters
     */
    getFilters() {
      return { ...activeFilters };
    },

    /**
     * Set organization filter
     * @param {string} org - Organization name
     * @param {boolean} active - Whether to include this org
     */
    setOrganization(org, active) {
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

    /**
     * Set a metric filter (starsMin, forksMin)
     * @param {string} metric - Metric name
     * @param {number|null} value - Minimum threshold, or null to clear
     */
    setMetricFilter(metric, value) {
      if (metric === 'starsMin' || metric === 'forksMin') {
        activeFilters[metric] = value;
      }

      if (onChange) {
        onChange(this.getFilters());
      }
    },

    /**
     * Clear all organization filters
     */
    clearOrganizations() {
      activeFilters.organizations = [];

      if (onChange) {
        onChange(this.getFilters());
      }
    },

    /**
     * Clear all filters (organizations and metrics)
     */
    clearAll() {
      activeFilters.organizations = [];
      activeFilters.starsMin = null;
      activeFilters.forksMin = null;

      if (onChange) {
        onChange(this.getFilters());
      }
    },

    /**
     * Check if any filters are active
     * @returns {boolean} True if any filters are active
     */
    hasActiveFilters() {
      return (
        activeFilters.organizations.length > 0 ||
        activeFilters.starsMin !== null ||
        activeFilters.forksMin !== null
      );
    }
  };
}
