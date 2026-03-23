// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { classifyByFilters } from '../data/classify';
import type { VisualizationNode, LinkData, FilterState } from '../types';

function makeRepo(id: string, owner: string, stars: number, forks: number): VisualizationNode {
  return {
    id,
    type: 'repo',
    label: id.split('/')[1] || id,
    data: { owner, stars, forks } as any,
    index: 0,
    degree: 1,
    x: 0, y: 0, r: 5,
    color: '#2E86AB',
    node_central: true,
  };
}

function makeContributor(id: string): VisualizationNode {
  return {
    id,
    type: 'contributor',
    label: id,
    data: { contributor_name: id, author_name: id } as any,
    index: 0,
    degree: 1,
    x: 0, y: 0, r: 8,
    color: '#3A9BBF',
    node_central: true,
  };
}

function makeOwner(id: string): VisualizationNode {
  return {
    id,
    type: 'owner',
    label: id,
    data: { owner: id } as any,
    index: 0,
    degree: 1,
    x: 0, y: 0, r: 3,
    color: '#CF3F02',
    node_central: true,
  };
}

function makeLink(sourceId: string, targetId: string, repo: string): LinkData {
  return {
    source: sourceId,
    target: targetId,
    repo,
    author_name: sourceId,
    commit_count: 5,
    commit_sec_min: '2024-01-01',
    commit_sec_max: '2024-06-01',
  };
}

function noFilters(): FilterState {
  return { organizations: [], starsMin: null, forksMin: null };
}

describe('classifyByFilters', () => {
  const repoA = makeRepo('alpha/repoA', 'alpha', 100, 20);
  const repoB = makeRepo('beta/repoB', 'beta', 50, 5);
  const repoC = makeRepo('alpha/repoC', 'alpha', 10, 1);
  const contrib1 = makeContributor('Alice');
  const contrib2 = makeContributor('Bob');
  const ownerAlpha = makeOwner('alpha');
  const ownerBeta = makeOwner('beta');

  const nodes = [repoA, repoB, repoC, contrib1, contrib2, ownerAlpha, ownerBeta];
  const links = [
    makeLink('Alice', 'alpha/repoA', 'alpha/repoA'),
    makeLink('Alice', 'beta/repoB', 'beta/repoB'),
    makeLink('Bob', 'alpha/repoC', 'alpha/repoC'),
  ];

  it('marks nothing as filtered out when no filters active', () => {
    classifyByFilters(nodes, links, noFilters());
    expect(nodes.every(n => n.filteredOut === false)).toBe(true);
    expect(links.every(l => l.filteredOut === false)).toBe(true);
  });

  it('filters by organization', () => {
    classifyByFilters(nodes, links, { organizations: ['alpha'], starsMin: null, forksMin: null });

    expect(repoA.filteredOut).toBe(false);
    expect(repoC.filteredOut).toBe(false);
    expect(repoB.filteredOut).toBe(true);

    expect(contrib1.filteredOut).toBe(false);
    expect(contrib2.filteredOut).toBe(false);

    expect(ownerAlpha.filteredOut).toBe(false);
    expect(ownerBeta.filteredOut).toBe(true);
  });

  it('filters by minimum stars', () => {
    classifyByFilters(nodes, links, { organizations: [], starsMin: 50, forksMin: null });

    expect(repoA.filteredOut).toBe(false);
    expect(repoB.filteredOut).toBe(false);
    expect(repoC.filteredOut).toBe(true);

    // Bob only contributes to repoC (10 stars) — filtered out
    expect(contrib2.filteredOut).toBe(true);
  });

  it('filters by minimum forks', () => {
    classifyByFilters(nodes, links, { organizations: [], starsMin: null, forksMin: 10 });

    expect(repoA.filteredOut).toBe(false);
    expect(repoB.filteredOut).toBe(true);
    expect(repoC.filteredOut).toBe(true);
  });

  it('applies combined filters (intersection)', () => {
    classifyByFilters(nodes, links, { organizations: ['alpha'], starsMin: 50, forksMin: null });

    expect(repoA.filteredOut).toBe(false);
    expect(repoB.filteredOut).toBe(true);
    expect(repoC.filteredOut).toBe(true);

    // Only Alice has a link to repoA
    expect(contrib1.filteredOut).toBe(false);
    expect(contrib2.filteredOut).toBe(true);
  });

  it('marks links based on endpoint visibility', () => {
    classifyByFilters(nodes, links, { organizations: ['alpha'], starsMin: null, forksMin: null });

    // Alice → repoA: both visible
    expect(links[0].filteredOut).toBe(false);
    // Alice → repoB: repoB filtered out
    expect(links[1].filteredOut).toBe(true);
    // Bob → repoC: both visible (alpha org)
    expect(links[2].filteredOut).toBe(false);
  });

  it('marks contributor→owner links visible when owner has visible repos', () => {
    const repo = makeRepo('alpha/repo1', 'alpha', 100, 10);
    const owner = makeOwner('alpha');
    const contrib = makeContributor('Carol');
    const ownerRepoLink = makeLink('alpha', 'alpha/repo1', 'alpha/repo1');
    const contribOwnerLink: LinkData = {
      source: 'Carol',
      target: 'alpha',
      owner: 'alpha',
      commit_count: 3,
      commit_sec_min: '2024-01-01',
      commit_sec_max: '2024-06-01',
    };

    const testNodes = [repo, owner, contrib];
    const testLinks = [ownerRepoLink, contribOwnerLink];

    classifyByFilters(testNodes, testLinks, { organizations: ['alpha'], starsMin: null, forksMin: null });

    expect(repo.filteredOut).toBe(false);
    expect(owner.filteredOut).toBe(false);
    expect(contrib.filteredOut).toBe(false);
    expect(ownerRepoLink.filteredOut).toBe(false);
    expect(contribOwnerLink.filteredOut).toBe(false);
  });
});
