import { describe, it, expect } from 'vitest';
import { renderMobileTooltip } from '../interaction/touch';
import type { VisualizationNode } from '../types';

function makeContributorNode(): VisualizationNode {
  return {
    id: 'alice',
    type: 'contributor',
    x: 0,
    y: 0,
    r: 10,
    data: {
      contributor_name: 'Alice Example',
      author_name: 'alice',
      color: '#443F3F',
      links_original: [
        { repo: 'repo1', commit_count: 5, commit_sec_min: new Date(), commit_sec_max: new Date() },
        { repo: 'repo2', commit_count: 3, commit_sec_min: new Date(), commit_sec_max: new Date() },
      ],
      total_commits: 8,
      contributor_lines: [],
      contributor_max_width: 0,
      repos: [],
      index: 0,
    },
  } as unknown as VisualizationNode;
}

function makeRepoNode(): VisualizationNode {
  return {
    id: 'org/my-repo',
    type: 'repo',
    x: 0,
    y: 0,
    r: 10,
    data: {
      name: 'my-repo',
      owner: 'org',
      repo: 'org/my-repo',
      color: '#443F3F',
      stars: 42,
      forks: 7,
      watchers: 15,
      createdAt: new Date('2020-01-01'),
      updatedAt: new Date('2024-06-01'),
      languages: ['TypeScript', 'Python', 'Go', 'Rust'],
      totalContributors: 5,
      orgContributors: 1,
      externalContributors: 4,
      totalCommits: 200,
      orgCommits: 150,
      license: 'MIT',
      archived: false,
      openIssues: 0,
      topics: [],
      hasDiscussions: false,
      multi_repo_owner: false,
      links_original: [],
      contributors: [],
      index: 0,
    },
  } as unknown as VisualizationNode;
}

function makeOwnerNode(): VisualizationNode {
  const repos = Array.from({ length: 15 }, (_, i) => ({
    id: `repo${i}`,
    type: 'repo' as const,
    x: 0, y: 0, r: 5,
    data: { name: `repo-${i}`, owner: 'myorg' },
  }));
  return {
    id: 'myorg',
    type: 'owner',
    x: 0,
    y: 0,
    r: 10,
    connected_node_cloud: repos,
    data: { owner: 'myorg', color: '#CF3F02' },
  } as unknown as VisualizationNode;
}

describe('renderMobileTooltip — contributor', () => {
  it('includes type label', () => {
    const html = renderMobileTooltip(makeContributorNode());
    expect(html).toContain('Contributor');
  });

  it('includes contributor name', () => {
    const html = renderMobileTooltip(makeContributorNode());
    expect(html).toContain('Alice Example');
  });

  it('includes repo count and commit count', () => {
    const html = renderMobileTooltip(makeContributorNode());
    expect(html).toContain('2 repos');
    expect(html).toContain('8 commits');
  });
});

describe('renderMobileTooltip — repo', () => {
  it('includes type label', () => {
    const html = renderMobileTooltip(makeRepoNode());
    expect(html).toContain('Repository');
  });

  it('includes owner/name', () => {
    const html = renderMobileTooltip(makeRepoNode());
    expect(html).toContain('org/');
    expect(html).toContain('my-repo');
  });

  it('includes stars, forks, watchers', () => {
    const html = renderMobileTooltip(makeRepoNode());
    expect(html).toContain('42');
    expect(html).toContain('7');
    expect(html).toContain('15');
  });

  it('includes up to 3 languages with overflow note', () => {
    const html = renderMobileTooltip(makeRepoNode());
    expect(html).toContain('TypeScript');
    expect(html).toContain('Python');
    expect(html).toContain('Go');
    expect(html).toContain('+ 1 more');
    expect(html).not.toContain('Rust'); // 4th language excluded
  });

  it('includes community metrics', () => {
    const html = renderMobileTooltip(makeRepoNode());
    expect(html).toContain('5 contributors');
    expect(html).toContain('200');
  });

  it('shows single-maintainer warning when orgContributors === 1', () => {
    const html = renderMobileTooltip(makeRepoNode());
    expect(html).toContain('Single');
  });

  it('includes license', () => {
    const html = renderMobileTooltip(makeRepoNode());
    expect(html).toContain('MIT');
  });

  it('does not show archived badge when not archived', () => {
    const html = renderMobileTooltip(makeRepoNode());
    expect(html).not.toContain('Archived');
  });

  it('shows archived badge when archived', () => {
    const node = makeRepoNode();
    (node.data as unknown as Record<string, unknown>).archived = true;
    const html = renderMobileTooltip(node);
    expect(html).toContain('Archived');
  });

  it('uses custom orgNickname in community metrics', () => {
    const html = renderMobileTooltip(makeRepoNode(), 'Acme');
    expect(html).toContain('Acme');
  });
});

describe('renderMobileTooltip — owner', () => {
  it('includes type label', () => {
    const html = renderMobileTooltip(makeOwnerNode());
    expect(html).toContain('Owner');
  });

  it('includes owner name', () => {
    const html = renderMobileTooltip(makeOwnerNode());
    expect(html).toContain('myorg');
  });

  it('includes repo count', () => {
    const html = renderMobileTooltip(makeOwnerNode());
    expect(html).toContain('15 repositories');
  });

  it('shows up to 12 repos with overflow note', () => {
    const html = renderMobileTooltip(makeOwnerNode());
    expect(html).toContain('repo-0');
    expect(html).toContain('repo-11');
    expect(html).toContain('+ 3 more');
    expect(html).not.toContain('repo-12'); // 13th excluded
  });
});
