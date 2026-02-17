/**
 * Data Preparation Module
 *
 * Transforms raw CSV data into the structured format needed for visualization.
 * Handles data normalization, node creation, link processing, and owner grouping.
 *
 * @module data/prepare
 */

import { isInteger } from '../utils/helpers.js';
import { createDateFormatters } from '../utils/formatters.js';
import { getLinkNodeId } from '../utils/validation.js';
import { debugWarn, isDebugEnabled } from '../utils/debug.js';

// ============================================================
// Helper Functions
// ============================================================

/**
 * Safely parse a date with validation
 * @param {*} value - The value to parse
 * @param {Function} parser - The date parsing function
 * @param {string} fieldName - Name of the field (for error messages)
 * @param {string} itemId - Identifier for the item (for error messages)
 * @returns {Date} - Parsed date or epoch fallback
 */
function safeParsDate(value, parser, fieldName, itemId) {
  if (value === null || value === undefined || value === '') {
    debugWarn(`Missing ${fieldName} for ${itemId}, using epoch fallback`);
    return new Date(0);
  }
  const parsed = parser(value);
  if (!parsed || isNaN(parsed.getTime())) {
    debugWarn(`Failed to parse ${fieldName} "${value}" for ${itemId}, using epoch fallback`);
    return new Date(0);
  }
  return parsed;
}

/**
 * Parse owner and name from repo string with validation
 * @param {string} repoString - Repository string in "owner/name" format
 * @returns {{ owner: string, name: string }} - Parsed owner and name
 * @throws {Error} - If format is invalid
 */
function parseRepoString(repoString) {
  if (!repoString || typeof repoString !== 'string') {
    throw new Error(`Invalid repo string: "${repoString}" (expected "owner/name" format)`);
  }
  const slashIdx = repoString.indexOf('/');
  if (slashIdx === -1) {
    throw new Error(`Invalid repo format: "${repoString}" (expected "owner/name" format, missing "/")`);
  }
  if (slashIdx === 0) {
    throw new Error(`Invalid repo format: "${repoString}" (owner cannot be empty)`);
  }
  if (slashIdx === repoString.length - 1) {
    throw new Error(`Invalid repo format: "${repoString}" (name cannot be empty)`);
  }
  return {
    owner: repoString.substring(0, slashIdx),
    name: repoString.substring(slashIdx + 1)
  };
}

/**
 * Prepare data for visualization
 *
 * This function transforms raw contributor, repository, and link data into
 * the structured format needed for the visualization. It:
 * - Normalizes contributor data (names, colors, text layout)
 * - Normalizes repository data (metadata, dates, languages)
 * - Normalizes link data (dates, source/target setup)
 * - Creates node objects from contributors and repos
 * - Groups repositories by owner and creates owner nodes
 * - Processes links to handle owner grouping
 * - Sets up scales based on data ranges
 * - Calculates node properties (radius, degree, etc.)
 *
 * **Note:** This function mutates the input arrays for performance reasons.
 * If you need immutable data, deep clone before calling.
 *
 * @param {Object} data - Input data:
 *   - contributors: Array of contributor objects
 *   - repos: Array of repository objects
 *   - links: Array of link objects
 * @param {Object} config - Configuration:
 *   - d3: D3 library instance
 *   - COLOR_CONTRIBUTOR: Color for contributor nodes
 *   - COLOR_REPO: Color for repository nodes
 *   - COLOR_OWNER: Color for owner nodes
 *   - MAX_CONTRIBUTOR_WIDTH: Maximum width for contributor name wrapping
 *   - context: Canvas 2D context (for text measurement)
 *   - isValidContributor: Function to validate contributor names
 *   - setContributorFont: Function to set contributor font
 *   - getLines: Function to calculate text lines
 * @param {Object} scales - D3 scales (will be updated):
 *   - scale_repo_radius: Scale for repository node radius
 *   - scale_contributor_radius: Scale for contributor node radius
 *   - scale_link_width: Scale for link width
 * @returns {Object} Prepared data:
 *   - nodes: Array of node objects
 *   - owners: Array of owner objects
 *   - nodes_central: Array of central nodes (same as nodes for now)
 */
export function prepareData(data, config, scales) {
  const {
    contributors,
    repos,
    links
  } = data;

  const {
    d3,
    COLOR_CONTRIBUTOR,
    COLOR_COMMUNITY_CONTRIBUTOR,
    COLOR_REPO,
    COLOR_OWNER,
    MAX_CONTRIBUTOR_WIDTH,
    context,
    isValidContributor,
    setContributorFont,
    getLines
  } = config;

  const {
    scale_repo_radius,
    scale_contributor_radius,
    scale_link_width
  } = scales;

  // Create date formatters
  const { parseDate, parseDateUnix } = createDateFormatters(d3);

  // ============================================================
  // Prepare Contributors
  // ============================================================
  contributors.forEach((d) => {
    d.contributor_name = d.author_name;
    // Tier comes from CSV: "core" or "community" (default to "core")
    d.tier = d.tier || 'core';
    d.color = d.tier === 'community'
      ? (COLOR_COMMUNITY_CONTRIBUTOR || COLOR_CONTRIBUTOR)
      : COLOR_CONTRIBUTOR;

    // Determine across how many lines to split the contributor name
    setContributorFont(context);
    [d.contributor_lines, d.contributor_max_width] = getLines(
      context,
      d.contributor_name,
      MAX_CONTRIBUTOR_WIDTH,
    );

    delete d.contributor_name_top;
  });

  // ============================================================
  // Prepare Repositories
  // ============================================================
  repos.forEach((d) => {
    // Basic metrics
    d.forks = +d.repo_forks;
    d.stars = +d.repo_stars;

    // Phase 1: Additional metadata
    d.watchers = +d.repo_watchers || 0;
    d.openIssues = +d.repo_open_issues || 0;
    d.license = d.repo_license || null;
    d.topics = d.repo_topics ? d.repo_topics.split(",").filter(t => t !== "") : [];
    d.hasDiscussions = d.repo_has_discussions === "true" || d.repo_has_discussions === true;
    d.archived = d.repo_archived === "true" || d.repo_archived === true;

    // Phase 2: Community metrics
    d.totalContributors = +d.repo_total_contributors || 0;
    d.coreContributors = +d.repo_core_contributors || 0;
    d.externalContributors = +d.repo_external_contributors || 0;
    d.communityRatio = +d.repo_community_ratio || 0;

    // Phase 3: Repository-centric extended metrics
    d.forkingOrganizations = d.repo_forking_organizations
      ? d.repo_forking_organizations.split(",").filter(o => o !== "")
      : [];

    // Parse dates with validation (check if unix time or ISO format)
    if (isInteger(d.createdAt)) {
      d.createdAt = safeParsDate(d.createdAt, parseDateUnix, 'createdAt', d.repo);
      d.updatedAt = safeParsDate(d.repo_updatedAt, parseDateUnix, 'updatedAt', d.repo);
    } else {
      d.createdAt = safeParsDate(d.repo_createdAt, parseDate, 'createdAt', d.repo);
      d.updatedAt = safeParsDate(d.repo_updatedAt, parseDate, 'updatedAt', d.repo);
    }

    // Extract owner and name from repo string (format: "owner/name")
    const repoParsed = parseRepoString(d.repo);
    d.owner = repoParsed.owner;
    d.name = repoParsed.name;

    // Parse languages
    d.languages = d.repo_languages.split(",");
    d.languages = d.languages.filter((l) => l !== "" && l !== " ");

    d.color = COLOR_REPO;

    // Clean up old property names
    delete d.repo_forks;
    delete d.repo_stars;
    delete d.repo_watchers;
    delete d.repo_open_issues;
    delete d.repo_license;
    delete d.repo_topics;
    delete d.repo_has_discussions;
    delete d.repo_archived;
    delete d.repo_total_contributors;
    delete d.repo_core_contributors;
    delete d.repo_external_contributors;
    delete d.repo_community_ratio;
    delete d.repo_forking_organizations;
    delete d.repo_createdAt;
    delete d.repo_updatedAt;
  });

  // ============================================================
  // Prepare Links
  // ============================================================
  links.forEach((d) => {
    d.contributor_name = d.author_name;
    d.commit_count = +d.commit_count;

    // Parse dates with validation (check if unix time or ISO format)
    const linkId = `${d.author_name} → ${d.repo}`;
    if (isInteger(d.commit_sec_min)) {
      d.commit_sec_min = safeParsDate(d.commit_sec_min, parseDateUnix, 'commit_sec_min', linkId);
      d.commit_sec_max = safeParsDate(d.commit_sec_max, parseDateUnix, 'commit_sec_max', linkId);
    } else {
      d.commit_sec_min = safeParsDate(d.commit_sec_min, parseDate, 'commit_sec_min', linkId);
      d.commit_sec_max = safeParsDate(d.commit_sec_max, parseDate, 'commit_sec_max', linkId);
    }

    // Extract owner and name from repo string
    const linkRepoParsed = parseRepoString(d.repo);
    d.owner = linkRepoParsed.owner;
    d.name = linkRepoParsed.name;

    // Set up initial source and target
    d.source = d.contributor_name;
    d.target = d.repo;

    delete d.author_name;
  });

  // ============================================================
  // Create Nodes
  // ============================================================
  const nodes = [];

  // Add contributor nodes
  contributors.forEach((d) => {
    nodes.push({
      id: d.contributor_name,
      type: "contributor",
      tier: d.tier || 'core',
      label: d.contributor_name,
      data: d,
    });
  });

  // Add repository nodes
  repos.forEach((d) => {
    nodes.push({
      id: d.repo,
      type: "repo",
      label: d.name,
      data: d,
    });
  });

  // ============================================================
  // Link Contributors and Repos
  // ============================================================
  // Store original links for each contributor and repo
  contributors.forEach((d) => {
    d.links_original = links.filter((l) => getLinkNodeId(l.source) === d.contributor_name);
    d.repos = d.links_original.map((l) =>
      repos.find((r) => r.repo === l.repo),
    );
  });

  repos.forEach((d) => {
    d.links_original = links.filter((l) => getLinkNodeId(l.target) === d.repo);
    d.contributors = d.links_original
      .map((l) => contributors.find((r) => r.contributor_name === l.contributor_name))
      .filter((c) => c !== undefined);
  });

  // ============================================================
  // Create Owner Groups
  // ============================================================
  // Find repos that share the same owner (owners with multiple repos)
  let owners = nodes
    .filter(
      (d) =>
        d.type === "repo" &&
        nodes.filter(
          (n) =>
            n.id !== d.id &&
            n.type === "repo" &&
            n.data.owner === d.data.owner,
        ).length > 1,
    )
    .map((d) => d.data);

  // Group by owner and aggregate stats
  owners = d3.group(owners, (d) => d.owner);
  owners = Array.from(owners, ([key, value]) => ({
    owner: key,
    repos: value.map((n) => n.name),
    color: COLOR_OWNER,
    stars: d3.sum(value, (d) => d.stars),
    forks: d3.sum(value, (d) => d.forks),
  }));

  // Sort by owner name
  owners.sort((a, b) => {
    if (a.owner.toLowerCase() < b.owner.toLowerCase()) return -1;
    else if (a.owner.toLowerCase() > b.owner.toLowerCase()) return 1;
    else return 0;
  });

  // Validate owners have repos (prevents positioning issues during filtering)
  const beforeOwnerCount = owners.length;
  owners = owners.filter(owner => {
    const ownerRepos = nodes.filter(n => n.type === 'repo' && n.data.owner === owner.owner);
    if (ownerRepos.length === 0) {
      debugWarn(`Filtering out owner with no repos: ${owner.owner}`);
      return false;
    }
    return true;
  });

  if (isDebugEnabled() && beforeOwnerCount !== owners.length) {
    console.debug(`Removed ${beforeOwnerCount - owners.length} owners with no repos`);
  }

  if (isDebugEnabled()) {
    console.log("Owners:", owners);
    console.log("Contributors:", contributors);
  }

  // Mark repos with multi-repo owners
  nodes
    .filter((d) => d.type === "repo")
    .forEach((d) => {
      d.data.multi_repo_owner = owners.find((o) => o.owner === d.data.owner)
        ? true
        : false;
    });

  // Add owner nodes
  owners.forEach((d) => {
    nodes.push({
      id: d.owner,
      type: "owner",
      label: d.owner,
      data: d,
    });
  });

  // ============================================================
  // Process Links for Owner Grouping
  // ============================================================
  // For repos owned by grouped owners, create links:
  // contributor -> owner -> repo (instead of contributor -> repo)
  let new_links_owner_repo = [];
  let new_links_contributor_owner = [];

  links.forEach((d) => {
    // For repos owned by grouped owners, create links through owner node
    if (owners.find((o) => o.owner === d.owner)) {
      // Add link from owner to repo
      new_links_owner_repo.push({
        source: d.owner,
        target: d.repo,
        owner: d.owner,
        commit_count: d.commit_count,
        commit_sec_min: d.commit_sec_min,
        commit_sec_max: d.commit_sec_max,
      });

      // Add link from contributor to owner
      new_links_contributor_owner.push({
        source: d.contributor_name,
        target: d.owner,
        owner: d.owner,
        commit_count: d.commit_count,
        commit_sec_min: d.commit_sec_min,
        commit_sec_max: d.commit_sec_max,
      });

      // Mark original link for removal
      d.to_remove = true;
    }
  });

  // Remove links that were replaced by owner grouping
  const filteredLinks = links.filter((d) => !(d.to_remove === true));

  // ============================================================
  // Deduplicate and Aggregate New Links
  // ============================================================
  // Group contributor->owner links by source+target and aggregate
  new_links_contributor_owner = d3.group(
    new_links_contributor_owner,
    (d) => d.source + "~" + d.target,
  );
  new_links_contributor_owner = Array.from(
    new_links_contributor_owner,
    ([key, value]) => {
      let [source, target] = key.split("~");
      return {
        source: source,
        target: target,
        owner: value[0].owner,
        commit_count: d3.sum(value, (d) => d.commit_count),
        commit_sec_min: d3.min(value, (d) => d.commit_sec_min),
        commit_sec_max: d3.max(value, (d) => d.commit_sec_max),
      };
    },
  );

  // Group owner->repo links by source+target and aggregate
  new_links_owner_repo = d3.group(
    new_links_owner_repo,
    (d) => d.source + "~" + d.target,
  );
  new_links_owner_repo = Array.from(new_links_owner_repo, ([key, value]) => {
    let [source, target] = key.split("~");
    return {
      source: source,
      target: target,
      owner: value[0].owner,
      commit_count: d3.sum(value, (d) => d.commit_count),
      commit_sec_min: d3.min(value, (d) => d.commit_sec_min),
      commit_sec_max: d3.max(value, (d) => d.commit_sec_max),
    };
  });

  // Combine all links
  let processedLinks = [...filteredLinks, ...new_links_owner_repo, ...new_links_contributor_owner];

  // ============================================================
  // Validate and Filter Links
  // ============================================================
  // Filter out links with empty or invalid source/target IDs
  processedLinks = processedLinks.filter(link => {
    if (!link.source || typeof link.source !== 'string' || link.source.trim() === '') {
      if (isDebugEnabled()) {
        console.warn(`Filtered link with empty source: → "${link.target}"`);
      }
      return false;
    }
    if (!link.target || typeof link.target !== 'string' || link.target.trim() === '') {
      if (isDebugEnabled()) {
        console.warn(`Filtered link with empty target: "${link.source}" →`);
      }
      return false;
    }
    return true;
  });

  // Validate all links reference nodes that exist
  const nodeIds = new Set(nodes.map(n => n.id));
  processedLinks = processedLinks.filter(link => {
    const sourceExists = nodeIds.has(link.source);
    const targetExists = nodeIds.has(link.target);
    if (!sourceExists || !targetExists) {
      if (isDebugEnabled()) {
        console.warn(`Filtered invalid link: "${link.source}" → "${link.target}"`, {
          sourceNodeExists: sourceExists,
          targetNodeExists: targetExists
        });
      }
      return false;
    }
    return true;
  });

  if (isDebugEnabled()) {
    console.log("Links:", processedLinks);
  }

  // ============================================================
  // Mark Single-Contributor Owners
  // ============================================================
  owners.forEach((d) => {
    // Get all links where owner is the target
    let links_owner = processedLinks.filter((l) => getLinkNodeId(l.target) === d.owner);
    d.single_contributor = links_owner.length === 1 ? true : false;

    // Get all repos connected to this owner
    d.repos = nodes
      .filter((n) => n.type === "repo" && n.data.owner === d.owner)
      .map((n) => n.data);
  });

  // ============================================================
  // Update Scales Based on Data
  // ============================================================
  const repoStars = repos.map((d) => d.stars);
  if (repoStars.length > 0) {
    scale_repo_radius.domain(d3.extent(repoStars));
  } else {
    scale_repo_radius.domain([0, 10]); // fallback for empty dataset
  }

  // Base contributor radius on total commit counts across all repos
  const contributorCommits = contributors.map((c) => {
    const contributorLinks = processedLinks.filter(
      (l) => getLinkNodeId(l.source) === c.contributor_name
    );
    return d3.sum(contributorLinks, (d) => d.commit_count);
  }).filter((c) => c > 0);
  if (contributorCommits.length > 0) {
    scale_contributor_radius.domain(d3.extent(contributorCommits));
  } else {
    scale_contributor_radius.domain([1, 10]); // fallback for empty dataset
  }

  if (processedLinks.length > 0) {
    scale_link_width.domain([1, 10, d3.max(processedLinks, (d) => d.commit_count)]);
  } else {
    scale_link_width.domain([1, 10, 60]); // fallback
  }

  // ============================================================
  // Calculate Node Properties
  // ============================================================
  nodes.forEach((d, i) => {
    d.index = i;
    d.data.index = i;

    // Calculate degree (number of connections)
    d.degree = processedLinks.filter(
      (l) => getLinkNodeId(l.source) === d.id || getLinkNodeId(l.target) === d.id,
    ).length;

    // Set initial position
    d.x = 0;
    d.y = 0;

    // Calculate radius based on node type
    if (d.type === "contributor") {
      // Calculate total commits across all repos for this contributor
      const contributorLinks = processedLinks.filter(
        (l) => getLinkNodeId(l.source) === d.id
      );
      const totalCommits = d3.sum(contributorLinks, (l) => l.commit_count);
      d.data.total_commits = totalCommits;
      d.r = totalCommits > 0 ? scale_contributor_radius(totalCommits) : scale_contributor_radius.range()[0];
    } else if (d.type === "repo") {
      d.r = scale_repo_radius(d.data.stars);
    } else {
      // "owner"
      d.r = scale_repo_radius(d.data.stars);
    }

    d.color = d.data.color;
  });

  // ============================================================
  // Sort Nodes
  // ============================================================
  nodes.sort((a, b) => {
    if (a.type === b.type) {
      if (a.type === "contributor") {
        // Alphabetical by label (case-insensitive)
        return a.label.toLowerCase().localeCompare(b.label.toLowerCase());
      }
      return 0;
    } else {
      if (a.type < b.type) return -1;
      else if (a.type > b.type) return 1;
      else return 0;
    }
  });

  // ============================================================
  // Return Prepared Data
  // ============================================================
  return {
    nodes,
    owners,
    nodes_central: nodes, // Alias for compatibility
    links: processedLinks
  };
}
