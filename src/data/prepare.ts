/**
 * Data Preparation Module
 *
 * Transforms raw CSV data into the structured format needed for visualization.
 * Handles data normalization, node creation, link processing, and owner grouping.
 *
 * @module data/prepare
 */

import * as d3 from "d3";
import { isInteger } from "../utils/helpers";
import { createDateFormatters } from "../utils/formatters";
import { getLinkNodeId } from "../utils/validation";
import { debugWarn, isDebugEnabled } from "../utils/debug";
import type {
  VisualizationNode,
  LinkData,
  RepoData,
  ContributorData,
  OwnerData,
  PreparedData,
} from "../types";

/**
 * Safely parse a date with validation.
 */
function safeParsDate(
  value: string | null | undefined,
  parser: (input: string) => Date | null,
  fieldName: string,
  itemId: string,
): Date {
  if (value === null || value === undefined || value === "") {
    debugWarn(`Missing ${fieldName} for ${itemId}, using epoch fallback`);
    return new Date(0);
  }
  const parsed = parser(value);
  if (!parsed || isNaN(parsed.getTime())) {
    debugWarn(
      `Failed to parse ${fieldName} "${value}" for ${itemId}, using epoch fallback`,
    );
    return new Date(0);
  }
  return parsed;
}

/**
 * Parse owner and name from repo string with validation.
 *
 * @param repoString - Repository string in "owner/name" format
 * @returns Parsed owner and name
 * @throws If format is invalid
 */
function parseRepoString(repoString: string): {
  owner: string;
  name: string;
} {
  if (!repoString || typeof repoString !== "string") {
    throw new Error(
      `Invalid repo string: "${repoString}" (expected "owner/name" format)`,
    );
  }
  const slashIdx = repoString.indexOf("/");
  if (slashIdx === -1) {
    throw new Error(
      `Invalid repo format: "${repoString}" (expected "owner/name" format, missing "/")`,
    );
  }
  if (slashIdx === 0) {
    throw new Error(
      `Invalid repo format: "${repoString}" (owner cannot be empty)`,
    );
  }
  if (slashIdx === repoString.length - 1) {
    throw new Error(
      `Invalid repo format: "${repoString}" (name cannot be empty)`,
    );
  }
  return {
    owner: repoString.substring(0, slashIdx),
    name: repoString.substring(slashIdx + 1),
  };
}

interface PrepareConfig {
  COLOR_CONTRIBUTOR: string;
  COLOR_REPO: string;
  COLOR_OWNER: string;
  MAX_CONTRIBUTOR_WIDTH: number;
  context: CanvasRenderingContext2D;
  isValidContributor: (name: string) => boolean;
  setContributorFont: (ctx: CanvasRenderingContext2D) => void;
  getLines: (
    ctx: CanvasRenderingContext2D,
    text: string,
    maxWidth: number,
  ) => [string[], number];
}

interface PrepareScales {
  scale_repo_radius: d3.ScaleLinear<number, number>;
  scale_owner_radius: d3.ScaleLinear<number, number>;
  scale_contributor_radius: d3.ScaleLinear<number, number>;
  scale_link_width: d3.ScaleLinear<number, number>;
}

interface PrepareInputData {
  contributors: ContributorData[];
  repos: RepoData[];
  links: LinkData[];
}

/**
 * Prepare data for visualization.
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
 * @param data - Input data with contributors, repos, and links
 * @param config - Configuration for colors, fonts, and text measurement
 * @param scales - D3 scales (will be updated)
 * @returns Prepared data with nodes, owners, nodes_central, and links
 */
export function prepareData(
  data: PrepareInputData,
  config: PrepareConfig,
  scales: PrepareScales,
): PreparedData {
  const { contributors, repos, links } = data;

  const {
    COLOR_CONTRIBUTOR,
    COLOR_REPO,
    COLOR_OWNER,
    MAX_CONTRIBUTOR_WIDTH,
    context,
    setContributorFont,
    getLines,
  } = config;

  const {
    scale_repo_radius,
    scale_owner_radius,
    scale_contributor_radius,
    scale_link_width,
  } = scales;

  const { parseDate, parseDateUnix } = createDateFormatters();

  contributors.forEach((d) => {
    d.contributor_name = d.author_name;
    d.color = COLOR_CONTRIBUTOR;

    setContributorFont(context);
    [d.contributor_lines, d.contributor_max_width] = getLines(
      context,
      d.contributor_name,
      MAX_CONTRIBUTOR_WIDTH,
    );

    delete (d as any).contributor_name_top;
  });

  repos.forEach((d) => {
    d.forks = +(d.repo_forks ?? 0);
    d.stars = +(d.repo_stars ?? 0);

    d.watchers = +(d.repo_watchers ?? 0);
    d.openIssues = +(d.repo_open_issues ?? 0);
    d.license = d.repo_license || null;
    d.topics = d.repo_topics
      ? d.repo_topics.split(",").filter((t) => t !== "")
      : [];
    d.hasDiscussions =
      d.repo_has_discussions === "true" || d.repo_has_discussions === true;
    d.archived = d.repo_archived === "true" || d.repo_archived === true;

    d.totalContributors = +(d.repo_total_contributors ?? 0);
    d.orgContributors = +(d.repo_core_contributors ?? 0);
    d.externalContributors = +(d.repo_external_contributors ?? 0);
    d.communityRatio = +(d.repo_community_ratio ?? 0);

    if (isInteger(d.createdAt as unknown as string)) {
      d.createdAt = safeParsDate(
        d.createdAt as unknown as string,
        parseDateUnix,
        "createdAt",
        d.repo,
      );
      d.updatedAt = safeParsDate(
        d.repo_updatedAt,
        parseDateUnix,
        "updatedAt",
        d.repo,
      );
    } else {
      d.createdAt = safeParsDate(
        d.repo_createdAt,
        parseDate,
        "createdAt",
        d.repo,
      );
      d.updatedAt = safeParsDate(
        d.repo_updatedAt,
        parseDate,
        "updatedAt",
        d.repo,
      );
    }

    const repoParsed = parseRepoString(d.repo);
    d.owner = repoParsed.owner;
    d.name = repoParsed.name;

    d.languages = d.repo_languages.split(",");
    d.languages = d.languages.filter((l) => l !== "" && l !== " ");

    d.color = COLOR_REPO;

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
    delete d.repo_createdAt;
    delete d.repo_updatedAt;
  });

  links.forEach((d) => {
    d.contributor_name = d.author_name;
    d.commit_count = +d.commit_count;

    const linkId = `${d.author_name} → ${d.repo}`;
    if (isInteger(d.commit_sec_min as string)) {
      d.commit_sec_min = safeParsDate(
        d.commit_sec_min as string,
        parseDateUnix,
        "commit_sec_min",
        linkId,
      );
      d.commit_sec_max = safeParsDate(
        d.commit_sec_max as string,
        parseDateUnix,
        "commit_sec_max",
        linkId,
      );
    } else {
      d.commit_sec_min = safeParsDate(
        d.commit_sec_min as string,
        parseDate,
        "commit_sec_min",
        linkId,
      );
      d.commit_sec_max = safeParsDate(
        d.commit_sec_max as string,
        parseDate,
        "commit_sec_max",
        linkId,
      );
    }

    const linkRepoParsed = parseRepoString(d.repo!);
    d.owner = linkRepoParsed.owner;
    d.name = linkRepoParsed.name;

    d.source = d.contributor_name!;
    d.target = d.repo!;

    delete d.author_name;
  });

  const nodes: VisualizationNode[] = [];

  contributors.forEach((d) => {
    nodes.push({
      id: d.contributor_name,
      type: "contributor",
      label: d.contributor_name,
      data: d,
    } as VisualizationNode);
  });

  repos.forEach((d) => {
    nodes.push({
      id: d.repo,
      type: "repo",
      label: d.name,
      data: d,
    } as VisualizationNode);
  });

  contributors.forEach((d) => {
    d.links_original = links.filter(
      (l) => getLinkNodeId(l.source) === d.contributor_name,
    );
    d.repos = d.links_original
      .map((l) => repos.find((r) => r.repo === l.repo))
      .filter((r): r is RepoData => r !== undefined);
  });

  repos.forEach((d) => {
    d.links_original = links.filter(
      (l) => getLinkNodeId(l.target) === d.repo,
    );
    d.contributors = d.links_original
      .map((l) =>
        contributors.find((r) => r.contributor_name === l.contributor_name),
      )
      .filter((c): c is ContributorData => c !== undefined);
    d.totalCommits = d.repo_total_commits ? +d.repo_total_commits : undefined;
    d.orgCommits = d3.sum(d.links_original, (l) => l.commit_count);
  });

  let owners: OwnerData[] = [];
  const repoNodes = nodes
    .filter((d) => d.type === "repo")
    .map((d) => d.data as RepoData);

  const ownerGroups = d3.group(repoNodes, (d) => d.owner);
  owners = Array.from(ownerGroups, ([key, value]) => ({
    owner: key,
    repos: value.map((n) => n.name),
    color: COLOR_OWNER,
    stars: d3.sum(value, (d) => d.stars),
    forks: d3.sum(value, (d) => d.forks),
    single_contributor: false,
  }));

  owners.sort((a, b) => {
    if (a.owner.toLowerCase() < b.owner.toLowerCase()) return -1;
    else if (a.owner.toLowerCase() > b.owner.toLowerCase()) return 1;
    else return 0;
  });

  const beforeOwnerCount = owners.length;
  owners = owners.filter((owner) => {
    const ownerRepos = nodes.filter(
      (n) => n.type === "repo" && (n.data as RepoData).owner === owner.owner,
    );
    if (ownerRepos.length === 0) {
      debugWarn(`Filtering out owner with no repos: ${owner.owner}`);
      return false;
    }
    return true;
  });

  if (isDebugEnabled() && beforeOwnerCount !== owners.length) {
    console.debug(
      `Removed ${beforeOwnerCount - owners.length} owners with no repos`,
    );
  }

  if (isDebugEnabled()) {
    console.log("Owners:", owners);
    console.log("Contributors:", contributors);
  }

  nodes
    .filter((d) => d.type === "repo")
    .forEach((d) => {
      (d.data as RepoData).multi_repo_owner = owners.some(
        (o) => o.owner === (d.data as RepoData).owner,
      );
    });

  owners.forEach((d) => {
    nodes.push({
      id: d.owner,
      type: "owner",
      label: d.owner,
      data: d,
    } as VisualizationNode);
  });

  let new_links_owner_repo: LinkData[] = [];
  let new_links_contributor_owner: LinkData[] = [];

  links.forEach((d) => {
    if (owners.find((o) => o.owner === d.owner)) {
      new_links_owner_repo.push({
        source: d.owner!,
        target: d.repo!,
        owner: d.owner,
        commit_count: d.commit_count,
        commit_sec_min: d.commit_sec_min,
        commit_sec_max: d.commit_sec_max,
      });

      new_links_contributor_owner.push({
        source: d.contributor_name!,
        target: d.owner!,
        owner: d.owner,
        commit_count: d.commit_count,
        commit_sec_min: d.commit_sec_min,
        commit_sec_max: d.commit_sec_max,
      });

      d.to_remove = true;
    }
  });

  const filteredLinks = links.filter((d) => !(d.to_remove === true));

  const contributorOwnerGroups = d3.group(
    new_links_contributor_owner,
    (d) => d.source + "~" + d.target,
  );
  new_links_contributor_owner = Array.from(
    contributorOwnerGroups,
    ([key, value]) => {
      const [source, target] = key.split("~");
      return {
        source,
        target,
        owner: value[0].owner,
        commit_count: d3.sum(value, (d) => d.commit_count),
        commit_sec_min: d3.min(value, (d) => d.commit_sec_min as Date)!,
        commit_sec_max: d3.max(value, (d) => d.commit_sec_max as Date)!,
      };
    },
  );

  const ownerRepoGroups = d3.group(
    new_links_owner_repo,
    (d) => d.source + "~" + d.target,
  );
  new_links_owner_repo = Array.from(ownerRepoGroups, ([key, value]) => {
    const [source, target] = key.split("~");
    return {
      source,
      target,
      owner: value[0].owner,
      commit_count: d3.sum(value, (d) => d.commit_count),
      commit_sec_min: d3.min(value, (d) => d.commit_sec_min as Date)!,
      commit_sec_max: d3.max(value, (d) => d.commit_sec_max as Date)!,
    };
  });

  let processedLinks: LinkData[] = [
    ...filteredLinks,
    ...new_links_owner_repo,
    ...new_links_contributor_owner,
  ];

  processedLinks = processedLinks.filter((link) => {
    if (
      !link.source ||
      typeof link.source !== "string" ||
      (link.source as string).trim() === ""
    ) {
      if (isDebugEnabled()) {
        console.warn(`Filtered link with empty source: → "${link.target}"`);
      }
      return false;
    }
    if (
      !link.target ||
      typeof link.target !== "string" ||
      (link.target as string).trim() === ""
    ) {
      if (isDebugEnabled()) {
        console.warn(`Filtered link with empty target: "${link.source}" →`);
      }
      return false;
    }
    return true;
  });

  const nodeIds = new Set(nodes.map((n) => n.id));
  processedLinks = processedLinks.filter((link) => {
    const sourceExists = nodeIds.has(link.source as string);
    const targetExists = nodeIds.has(link.target as string);
    if (!sourceExists || !targetExists) {
      if (isDebugEnabled()) {
        console.warn(
          `Filtered invalid link: "${link.source}" → "${link.target}"`,
          {
            sourceNodeExists: sourceExists,
            targetNodeExists: targetExists,
          },
        );
      }
      return false;
    }
    return true;
  });

  if (isDebugEnabled()) {
    console.log("Links:", processedLinks);
  }

  owners.forEach((d) => {
    const links_owner = processedLinks.filter(
      (l) => getLinkNodeId(l.target) === d.owner,
    );
    d.single_contributor = links_owner.length === 1;

    d.repos = nodes
      .filter(
        (n) => n.type === "repo" && (n.data as RepoData).owner === d.owner,
      )
      .map((n) => n.data as RepoData);
  });

  const repoStars = repos.map((d) => d.stars);
  if (repoStars.length > 0) {
    scale_repo_radius.domain(d3.extent(repoStars) as [number, number]);
  } else {
    scale_repo_radius.domain([0, 10]);
  }

  const ownerStars = owners.map((d) => d.stars);
  if (ownerStars.length > 0) {
    scale_owner_radius.domain(d3.extent(ownerStars) as [number, number]);
  } else {
    scale_owner_radius.domain([0, 10]);
  }

  const contributorCommits = contributors
    .map((c) => {
      const contributorLinks = processedLinks.filter(
        (l) => getLinkNodeId(l.source) === c.contributor_name,
      );
      return d3.sum(contributorLinks, (d) => d.commit_count);
    })
    .filter((c) => c > 0);
  if (contributorCommits.length > 0) {
    scale_contributor_radius.domain(
      d3.extent(contributorCommits) as [number, number],
    );
  } else {
    scale_contributor_radius.domain([1, 10]);
  }

  if (processedLinks.length > 0) {
    scale_link_width.domain([
      1,
      10,
      d3.max(processedLinks, (d) => d.commit_count)!,
    ]);
  } else {
    scale_link_width.domain([1, 10, 60]);
  }

  nodes.forEach((d, i) => {
    d.index = i;
    (d.data as any).index = i;

    d.degree = processedLinks.filter(
      (l) =>
        getLinkNodeId(l.source) === d.id || getLinkNodeId(l.target) === d.id,
    ).length;

    d.x = 0;
    d.y = 0;

    if (d.type === "contributor") {
      const contributorLinks = processedLinks.filter(
        (l) => getLinkNodeId(l.source) === d.id,
      );
      const totalCommits = d3.sum(contributorLinks, (l) => l.commit_count);
      (d.data as ContributorData).total_commits = totalCommits;
      d.r =
        totalCommits > 0
          ? scale_contributor_radius(totalCommits)
          : scale_contributor_radius.range()[0];
    } else if (d.type === "repo") {
      d.r = scale_repo_radius((d.data as RepoData).stars);
    } else {
      d.r = scale_owner_radius((d.data as OwnerData).stars);
    }

    d.color = (d.data as { color: string }).color;
  });

  nodes.sort((a, b) => {
    if (a.type === b.type) {
      if (a.type === "contributor") {
        return a.label.toLowerCase().localeCompare(b.label.toLowerCase());
      }
      return 0;
    } else {
      if (a.type < b.type) return -1;
      else if (a.type > b.type) return 1;
      else return 0;
    }
  });

  return {
    nodes,
    owners,
    nodes_central: nodes,
    links: processedLinks,
  };
}
