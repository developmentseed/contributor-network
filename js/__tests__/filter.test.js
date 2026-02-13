/**
 * Filter Module Tests
 *
 * Tests for the pure filter functions to ensure correct behavior
 * when filtering contributors, repos, and links.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  deepClone,
  getRepoOwner,
  filterReposByOrganization,
  filterReposByStars,
  filterReposByForks,
  filterLinksByRepos,
  filterLinksByContributors,
  filterContributorsByLinks,
  applyFilters,
  createFilterManager
} from '../data/filter.js';

// Sample test data
const sampleRepos = [
  { repo: 'developmentseed/titiler', stars: 100, repo_stars: '1036', repo_forks: '216' },
  { repo: 'developmentseed/rio-cogeo', stars: 50, repo_stars: '50', repo_forks: '10' },
  { repo: 'stac-utils/stac-fastapi', stars: 200, repo_stars: '304', repo_forks: '116' },
  { repo: 'radiantearth/stac-spec', stars: 300, repo_stars: '875', repo_forks: '188' },
  { repo: 'DevSeed Team', stars: 0, repo_stars: '0', repo_forks: '0' }  // Central pseudo-repo
];

const sampleContributors = [
  { author_name: 'Alice', commits: 100 },
  { author_name: 'Bob', commits: 50 },
  { author_name: 'Charlie', commits: 25 }
];

const sampleLinks = [
  { author_name: 'Alice', repo: 'developmentseed/titiler', commit_count: 50 },
  { author_name: 'Alice', repo: 'stac-utils/stac-fastapi', commit_count: 30 },
  { author_name: 'Bob', repo: 'developmentseed/titiler', commit_count: 20 },
  { author_name: 'Bob', repo: 'radiantearth/stac-spec', commit_count: 10 },
  { author_name: 'Charlie', repo: 'radiantearth/stac-spec', commit_count: 25 }
];

describe('deepClone', () => {
  it('should create a deep copy of an object', () => {
    const original = { a: 1, b: { c: 2 } };
    const cloned = deepClone(original);

    expect(cloned).toEqual(original);
    expect(cloned).not.toBe(original);
    expect(cloned.b).not.toBe(original.b);
  });

  it('should create a deep copy of an array', () => {
    const original = [{ a: 1 }, { b: 2 }];
    const cloned = deepClone(original);

    expect(cloned).toEqual(original);
    expect(cloned).not.toBe(original);
    expect(cloned[0]).not.toBe(original[0]);
  });

  it('should not affect original when clone is modified', () => {
    const original = { a: 1, b: { c: 2 } };
    const cloned = deepClone(original);

    cloned.a = 999;
    cloned.b.c = 999;

    expect(original.a).toBe(1);
    expect(original.b.c).toBe(2);
  });
});

describe('getRepoOwner', () => {
  it('should extract owner from full repo name', () => {
    expect(getRepoOwner('developmentseed/titiler')).toBe('developmentseed');
    expect(getRepoOwner('stac-utils/stac-fastapi')).toBe('stac-utils');
  });

  it('should handle repo names without slash', () => {
    expect(getRepoOwner('DevSeed Team')).toBe('DevSeed Team');
  });

  it('should handle empty string', () => {
    expect(getRepoOwner('')).toBe('');
  });
});

describe('filterReposByOrganization', () => {
  it('should return all repos when organizations is empty', () => {
    const result = filterReposByOrganization(sampleRepos, []);
    expect(result).toEqual(sampleRepos);
  });

  it('should filter to single organization', () => {
    const result = filterReposByOrganization(sampleRepos, ['developmentseed']);

    expect(result).toHaveLength(2);
    expect(result.every(r => r.repo.startsWith('developmentseed/'))).toBe(true);
  });

  it('should filter to multiple organizations', () => {
    const result = filterReposByOrganization(sampleRepos, ['developmentseed', 'stac-utils']);

    expect(result).toHaveLength(3);
  });

  it('should always include central repo when specified', () => {
    const result = filterReposByOrganization(sampleRepos, ['stac-utils'], 'DevSeed Team');

    expect(result).toHaveLength(2);
    expect(result.some(r => r.repo === 'DevSeed Team')).toBe(true);
    expect(result.some(r => r.repo === 'stac-utils/stac-fastapi')).toBe(true);
  });
});

describe('filterLinksByRepos', () => {
  it('should filter links to only visible repos', () => {
    const visibleRepoNames = new Set(['developmentseed/titiler']);
    const result = filterLinksByRepos(sampleLinks, visibleRepoNames);

    expect(result).toHaveLength(2);
    expect(result.every(l => l.repo === 'developmentseed/titiler')).toBe(true);
  });

  it('should return empty array when no repos match', () => {
    const visibleRepoNames = new Set(['nonexistent/repo']);
    const result = filterLinksByRepos(sampleLinks, visibleRepoNames);

    expect(result).toHaveLength(0);
  });
});

describe('filterLinksByContributors', () => {
  it('should filter links to only visible contributors', () => {
    const visibleContributorNames = new Set(['Alice']);
    const result = filterLinksByContributors(sampleLinks, visibleContributorNames);

    expect(result).toHaveLength(2);
    expect(result.every(l => l.author_name === 'Alice')).toBe(true);
  });
});

describe('filterContributorsByLinks', () => {
  it('should filter contributors to those with visible links', () => {
    const visibleContributorNames = new Set(['Alice', 'Bob']);
    const result = filterContributorsByLinks(sampleContributors, visibleContributorNames);

    expect(result).toHaveLength(2);
    expect(result.map(c => c.author_name)).toEqual(['Alice', 'Bob']);
  });
});

describe('filterReposByStars', () => {
  it('should filter repos below the star threshold', () => {
    const result = filterReposByStars(sampleRepos, 100);

    // titiler (1036), stac-fastapi (304), stac-spec (875) pass
    expect(result).toHaveLength(3);
    expect(result.every(r => +r.repo_stars >= 100)).toBe(true);
  });

  it('should return all repos when threshold is 0', () => {
    const result = filterReposByStars(sampleRepos, 0);
    expect(result).toHaveLength(sampleRepos.length);
  });

  it('should return empty array when threshold exceeds all repos', () => {
    const result = filterReposByStars(sampleRepos, 5000);
    expect(result).toHaveLength(0);
  });

  it('should handle string repo_stars values from CSV', () => {
    const repos = [
      { repo: 'test/a', repo_stars: '150' },
      { repo: 'test/b', repo_stars: '50' }
    ];
    const result = filterReposByStars(repos, 100);
    expect(result).toHaveLength(1);
    expect(result[0].repo).toBe('test/a');
  });
});

describe('filterReposByForks', () => {
  it('should filter repos below the fork threshold', () => {
    const result = filterReposByForks(sampleRepos, 100);

    // titiler (216), stac-fastapi (116), stac-spec (188) pass
    expect(result).toHaveLength(3);
    expect(result.every(r => +r.repo_forks >= 100)).toBe(true);
  });

  it('should return all repos when threshold is 0', () => {
    const result = filterReposByForks(sampleRepos, 0);
    expect(result).toHaveLength(sampleRepos.length);
  });

  it('should return empty array when threshold exceeds all repos', () => {
    const result = filterReposByForks(sampleRepos, 5000);
    expect(result).toHaveLength(0);
  });
});

describe('applyFilters', () => {
  let originalData;

  beforeEach(() => {
    originalData = {
      contributors: sampleContributors,
      repos: sampleRepos,
      links: sampleLinks
    };
  });

  it('should return all data when no filters active', () => {
    const result = applyFilters(originalData, { organizations: [] });

    expect(result.repos).toHaveLength(sampleRepos.length);
    expect(result.contributors).toHaveLength(sampleContributors.length);
    expect(result.links).toHaveLength(sampleLinks.length);
  });

  it('should filter by organization correctly', () => {
    const result = applyFilters(originalData, { organizations: ['developmentseed'] });

    // Only developmentseed repos
    expect(result.repos).toHaveLength(2);

    // Only contributors with links to developmentseed
    // Alice and Bob have links to developmentseed/titiler
    expect(result.contributors).toHaveLength(2);
    expect(result.contributors.map(c => c.author_name).sort()).toEqual(['Alice', 'Bob']);

    // Only links to developmentseed repos
    expect(result.links).toHaveLength(2);
  });

  it('should include central repo when specified', () => {
    const result = applyFilters(
      originalData,
      { organizations: ['stac-utils'] },
      { centralRepo: 'DevSeed Team' }
    );

    expect(result.repos.some(r => r.repo === 'DevSeed Team')).toBe(true);
  });

  it('should return deep clones to prevent mutation', () => {
    const result = applyFilters(originalData, { organizations: [] });

    // Modify the result
    result.repos[0].stars = 999;
    result.contributors[0].commits = 999;
    result.links[0].commit_count = 999;

    // Original should be unchanged
    expect(originalData.repos[0].stars).toBe(100);
    expect(originalData.contributors[0].commits).toBe(100);
    expect(originalData.links[0].commit_count).toBe(50);
  });

  it('should handle empty original data gracefully', () => {
    const result = applyFilters(
      { contributors: null, repos: null, links: null },
      { organizations: [] }
    );

    expect(result.contributors).toEqual([]);
    expect(result.repos).toEqual([]);
    expect(result.links).toEqual([]);
  });

  it('should filter by minimum stars', () => {
    const result = applyFilters(originalData, { organizations: [], starsMin: 500, forksMin: null });

    // titiler (1036) and stac-spec (875) pass; stac-fastapi (304) and rio-cogeo (50) don't
    expect(result.repos.length).toBeLessThan(sampleRepos.length);
    expect(result.repos.every(r => +r.repo_stars >= 500)).toBe(true);
  });

  it('should filter by minimum forks', () => {
    const result = applyFilters(originalData, { organizations: [], starsMin: null, forksMin: 100 });

    // titiler (216), stac-fastapi (116), stac-spec (188) pass
    expect(result.repos).toHaveLength(3);
    expect(result.repos.every(r => +r.repo_forks >= 100)).toBe(true);
  });

  it('should compose organization and metric filters', () => {
    const result = applyFilters(originalData, {
      organizations: ['developmentseed'],
      starsMin: 100,
      forksMin: null
    });

    // Only developmentseed repos with 100+ stars: titiler (1036) passes, rio-cogeo (50) doesn't
    expect(result.repos).toHaveLength(1);
    expect(result.repos[0].repo).toBe('developmentseed/titiler');
  });

  it('should correctly chain filters (repos → links → contributors → links)', () => {
    // Filter to radiantearth only
    const result = applyFilters(originalData, { organizations: ['radiantearth'] });

    // Should only have radiantearth/stac-spec
    expect(result.repos).toHaveLength(1);
    expect(result.repos[0].repo).toBe('radiantearth/stac-spec');

    // Bob and Charlie have links to radiantearth
    expect(result.contributors).toHaveLength(2);
    expect(result.contributors.map(c => c.author_name).sort()).toEqual(['Bob', 'Charlie']);

    // Only links from Bob and Charlie to radiantearth
    expect(result.links).toHaveLength(2);
  });
});

describe('createFilterManager', () => {
  it('should start with empty filters', () => {
    const manager = createFilterManager();
    expect(manager.getFilters()).toEqual({ organizations: [], starsMin: null, forksMin: null });
  });

  it('should add organization when setOrganization called with true', () => {
    const manager = createFilterManager();
    manager.setOrganization('developmentseed', true);

    expect(manager.getFilters().organizations).toContain('developmentseed');
  });

  it('should remove organization when setOrganization called with false', () => {
    const manager = createFilterManager();
    manager.setOrganization('developmentseed', true);
    manager.setOrganization('developmentseed', false);

    expect(manager.getFilters().organizations).not.toContain('developmentseed');
  });

  it('should support multiple organizations', () => {
    const manager = createFilterManager();
    manager.setOrganization('developmentseed', true);
    manager.setOrganization('stac-utils', true);

    expect(manager.getFilters().organizations).toHaveLength(2);
  });

  it('should clear all organizations', () => {
    const manager = createFilterManager();
    manager.setOrganization('developmentseed', true);
    manager.setOrganization('stac-utils', true);
    manager.clearOrganizations();

    expect(manager.getFilters().organizations).toHaveLength(0);
  });

  it('should call onChange callback when filters change', () => {
    let callCount = 0;
    let lastFilters = null;

    const manager = createFilterManager((filters) => {
      callCount++;
      lastFilters = filters;
    });

    manager.setOrganization('developmentseed', true);

    expect(callCount).toBe(1);
    expect(lastFilters.organizations).toContain('developmentseed');
  });

  it('should report hasActiveFilters correctly', () => {
    const manager = createFilterManager();

    expect(manager.hasActiveFilters()).toBe(false);

    manager.setOrganization('developmentseed', true);
    expect(manager.hasActiveFilters()).toBe(true);

    manager.clearOrganizations();
    expect(manager.hasActiveFilters()).toBe(false);
  });

  it('should set metric filters', () => {
    const manager = createFilterManager();
    manager.setMetricFilter('starsMin', 100);

    expect(manager.getFilters().starsMin).toBe(100);
    expect(manager.hasActiveFilters()).toBe(true);
  });

  it('should clear metric filters with null', () => {
    const manager = createFilterManager();
    manager.setMetricFilter('starsMin', 100);
    manager.setMetricFilter('starsMin', null);

    expect(manager.getFilters().starsMin).toBeNull();
    expect(manager.hasActiveFilters()).toBe(false);
  });

  it('should report hasActiveFilters for metric filters', () => {
    const manager = createFilterManager();

    manager.setMetricFilter('forksMin', 50);
    expect(manager.hasActiveFilters()).toBe(true);

    manager.setMetricFilter('forksMin', null);
    expect(manager.hasActiveFilters()).toBe(false);
  });

  it('should clear all filters including metrics', () => {
    const manager = createFilterManager();
    manager.setOrganization('developmentseed', true);
    manager.setMetricFilter('starsMin', 100);
    manager.setMetricFilter('forksMin', 50);
    manager.clearAll();

    expect(manager.getFilters()).toEqual({
      organizations: [],
      starsMin: null,
      forksMin: null
    });
    expect(manager.hasActiveFilters()).toBe(false);
  });

  it('should call onChange when metric filter changes', () => {
    let lastFilters = null;
    const manager = createFilterManager((filters) => {
      lastFilters = filters;
    });

    manager.setMetricFilter('starsMin', 500);

    expect(lastFilters.starsMin).toBe(500);
  });

  it('should ignore invalid metric names', () => {
    const manager = createFilterManager();
    manager.setMetricFilter('invalidMetric', 100);

    const filters = manager.getFilters();
    expect(filters.invalidMetric).toBeUndefined();
  });
});
