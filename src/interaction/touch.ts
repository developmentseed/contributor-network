import * as d3 from 'd3';
import { findNode } from './findNode';
import { drawWithZoomTransform } from './zoom';
import { isTouchDevice } from '../utils/helpers';
import type {
  VisualizationConfig,
  DelaunayData,
  InteractionState,
  ZoomState,
  VisualizationNode,
} from '../types';

export interface SetupTouchOptions {
  canvasSelector: string;
  config: VisualizationConfig;
  delaunayData: DelaunayData;
  interactionState: InteractionState;
  canvas: HTMLCanvasElement;
  contextClick: CanvasRenderingContext2D;
  contextHover: CanvasRenderingContext2D;
  nodes: VisualizationNode[];
  setClicked: (state: InteractionState, node: VisualizationNode) => void;
  clearClick: (state: InteractionState) => void;
  clearHover: (state: InteractionState) => void;
  setDelaunay: (
    state: InteractionState,
    delaunay: d3.Delaunay<[number, number]>,
    nodesDelaunay: VisualizationNode[],
  ) => void;
  drawHoverState: (
    context: CanvasRenderingContext2D,
    node: VisualizationNode,
    showTooltip?: boolean,
  ) => void;
  zoomState?: ZoomState | null;
  tooltipEl: HTMLElement;
  tooltipContentEl: HTMLElement;
  orgNickname?: string;
}

/**
 * Renders the mobile tooltip HTML for a given node.
 * Exported for unit testing.
 */
export function renderMobileTooltip(node: VisualizationNode, orgNickname = 'DevSeed'): string {
  const data = node.data as Record<string, any>;

  if (node.type === 'contributor') {
    const name = data.contributor_name ?? data.author_name ?? '';
    const repoCount = (data.links_original as unknown[])?.length ?? 0;
    const totalCommits = (data.total_commits as number) || 0;
    return `
      <p class="tooltip-type-label">Contributor</p>
      <p class="tooltip-title">${escapeHtml(name)}</p>
      <p class="tooltip-subtitle">${repoCount} ${repoCount === 1 ? 'repo' : 'repos'} · ${totalCommits.toLocaleString()} commits</p>
    `;
  }

  if (node.type === 'owner') {
    const ownerName = data.owner ?? '';
    const repos = (node.connected_node_cloud ?? []) as VisualizationNode[];
    const repoCount = repos.length;
    const MAX_REPOS = 12;
    const visible = repos.slice(0, MAX_REPOS);
    const hidden = repoCount - MAX_REPOS;
    const repoListItems = visible
      .map(r => `<span>${escapeHtml((r.data as Record<string, any>).name ?? '')}</span>`)
      .join(' · ');
    const overflowLine = hidden > 0 ? `<p class="tooltip-subtitle">+ ${hidden} more</p>` : '';
    return `
      <p class="tooltip-type-label">Owner</p>
      <p class="tooltip-title">${escapeHtml(ownerName)}</p>
      <p class="tooltip-subtitle">${repoCount} ${repoCount === 1 ? 'repository' : 'repositories'}</p>
      <div class="tooltip-section">
        <p class="tooltip-section-label">Repositories</p>
        <p>${repoListItems}</p>
        ${overflowLine}
      </div>
    `;
  }

  if (node.type === 'repo') {
    return renderRepoTooltip(data, orgNickname);
  }

  return '';
}

function renderRepoTooltip(data: Record<string, any>, orgNickname: string): string {
  const created = data.createdAt instanceof Date
    ? formatMonthYear(data.createdAt)
    : String(data.createdAt ?? '');
  const updated = data.updatedAt instanceof Date
    ? formatMonthYear(data.updatedAt)
    : String(data.updatedAt ?? '');

  const statsLine = `★ ${data.stars ?? 0}  ⑂ ${data.forks ?? 0}  👁 ${data.watchers ?? 0}`;

  let languagesSection = '';
  if (data.languages && (data.languages as string[]).length > 0) {
    const langs = data.languages as string[];
    const MAX_LANGS = 3;
    const visible = langs.slice(0, MAX_LANGS).join(', ');
    const overflow = langs.length > MAX_LANGS ? `<br>+ ${langs.length - MAX_LANGS} more` : '';
    languagesSection = `
      <div class="tooltip-section">
        <p class="tooltip-section-label">Languages</p>
        <p>${escapeHtml(visible)}${overflow}</p>
      </div>`;
  }

  let communitySection = '';
  if (data.totalContributors && data.totalContributors > 0) {
    const total = data.totalContributors as number;
    const orgC = (data.orgContributors as number) || 0;
    const extC = (data.externalContributors as number) || 0;
    const totalCommits = data.totalCommits as number | undefined;
    const orgCommits = data.orgCommits as number | undefined;
    const orgPct = totalCommits ? Math.round(((orgCommits ?? 0) / totalCommits) * 100) : null;

    const commitsLine = totalCommits
      ? `<p>${totalCommits.toLocaleString()} total commits${orgPct !== null ? ` (${orgPct}% from ${escapeHtml(orgNickname)})` : ''}</p>`
      : '';
    const warningLine = orgC === 1
      ? `<p class="tooltip-warning">⚠ Single ${escapeHtml(orgNickname)} maintainer</p>`
      : '';

    communitySection = `
      <div class="tooltip-section">
        <p class="tooltip-section-label">Community</p>
        <p>${total} contributors (${orgC} ${escapeHtml(orgNickname)}, ${extC} community)</p>
        ${commitsLine}
        ${warningLine}
      </div>`;
  }

  let licenseSection = '';
  if (data.license) {
    licenseSection = `
      <div class="tooltip-section">
        <p>License: ${escapeHtml(String(data.license))}</p>
      </div>`;
  }

  let archivedSection = '';
  if (data.archived) {
    archivedSection = `
      <div class="tooltip-section">
        <p class="tooltip-archived">📦 Archived</p>
      </div>`;
  }

  return `
    <p class="tooltip-type-label">Repository</p>
    <p class="tooltip-title">${escapeHtml(data.owner ?? '')}/<wbr>${escapeHtml(data.name ?? '')}</p>
    <p class="tooltip-subtitle">Created ${created} · Updated ${updated}</p>
    <div class="tooltip-section">
      <p>${statsLine}</p>
    </div>
    ${languagesSection}
    ${communitySection}
    ${licenseSection}
    ${archivedSection}
  `;
}

function formatMonthYear(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Sets up touch interaction handlers on the canvas for mobile devices.
 * Manages a DOM tooltip and canvas highlight state via a single touchstart handler.
 */
export function setupTouch(_options: SetupTouchOptions): void {
  // Implementation in Task 8
}
