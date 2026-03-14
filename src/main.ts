import * as d3 from "d3";
import { createContributorNetworkVisual } from "./chart";

interface Config {
  organization_name?: string;
  organization_nickname?: string;
  contributor_padding?: number;
  contributors?: Record<string, string>;
  title?: string;
  description?: string;
}

const configResponse = await fetch("data/config.json");
if (!configResponse.ok) {
  document.getElementById("chart-container")!.innerHTML =
    '<p style="color: red; padding: 20px;">Error: Could not load config.json. Run the build command or create data/config.json for local development.</p>';
  throw new Error("Failed to load config.json");
}
const config: Config = await configResponse.json();

const organizationName = config.organization_name || "Development Seed";
const orgNickname = config.organization_nickname || organizationName;
const contributor_padding = config.contributor_padding || 20;

const masterContributors: Record<string, string> = config.contributors || {};
const displayNameToUsername: Record<string, string> = {};
Object.entries(masterContributors).forEach(([username, displayName]) => {
  displayNameToUsername[displayName] = username;
});

document.getElementById("title-repo-name")!.textContent = organizationName;
if (config.title) document.title = config.title;
if (config.description)
  document.getElementById("chart-description")!.textContent =
    config.description;

const container = document.getElementById("chart-container")!;
const wrapper = document.getElementById("chart-wrapper")!;

function getChartDimensions(): number {
  const wrapperRect = wrapper.getBoundingClientRect();
  let availableWidth = wrapperRect.width - 40;
  if (availableWidth < 400) {
    availableWidth = Math.min(window.innerWidth - 40, 1400 - 40);
  }
  return Math.max(availableWidth, 320);
}

let size = getChartDimensions();
container.style.height = size + "px";

const contributorNetworkVisual = createContributorNetworkVisual(
  container,
  contributor_padding,
  masterContributors,
  displayNameToUsername,
  orgNickname,
);
contributorNetworkVisual.width(size).height(size);

const promises = [
  d3.csv("data/top_contributors.csv"),
  d3.csv("data/repositories.csv"),
  d3.csv("data/links.csv"),
];

document.fonts.ready.then(() => {
  Promise.all(promises)
    .then((values) => {
      const uniqueOrgs = new Set<string>();
      values[1].forEach((repo) => {
        const owner = repo.repo!.substring(0, repo.repo!.indexOf("/"));
        if (owner) uniqueOrgs.add(owner);
      });

      const sortedOrgs = Array.from(uniqueOrgs).sort();
      const orgSelect = document.getElementById(
        "org-select"
      ) as HTMLSelectElement;
      sortedOrgs.forEach((org) => {
        const option = document.createElement("option");
        option.value = org;
        option.textContent = org;
        orgSelect.appendChild(option);
      });

      let currentSelectedOrg: string | null = null;
      orgSelect.addEventListener("change", function () {
        const selectedOrg = this.value;
        if (selectedOrg === "") {
          if (currentSelectedOrg) {
            contributorNetworkVisual.setFilter(currentSelectedOrg, false);
            currentSelectedOrg = null;
          }
        } else {
          if (currentSelectedOrg && currentSelectedOrg !== selectedOrg) {
            contributorNetworkVisual.setFilter(currentSelectedOrg, false);
          }
          contributorNetworkVisual.setFilter(selectedOrg, true);
          currentSelectedOrg = selectedOrg;
        }
        updateFilterStats();
      });

      const starsSelect = document.getElementById(
        "stars-select"
      ) as HTMLSelectElement;
      starsSelect.addEventListener("change", function () {
        const value =
          this.value === "" ? null : parseInt(this.value, 10);
        contributorNetworkVisual.setRepoFilter("starsMin", value);
        updateFilterStats();
      });

      const forksSelect = document.getElementById(
        "forks-select"
      ) as HTMLSelectElement;
      forksSelect.addEventListener("change", function () {
        const value =
          this.value === "" ? null : parseInt(this.value, 10);
        contributorNetworkVisual.setRepoFilter("forksMin", value);
        updateFilterStats();
      });

      function updateFilterStats(): void {
        const statsElement = document.getElementById("filter-stats")!;
        const parts: string[] = [];

        if (currentSelectedOrg !== null) {
          parts.push(`org: ${currentSelectedOrg}`);
        }
        if (starsSelect.value !== "") {
          parts.push(`stars: ${starsSelect.value}+`);
        }
        if (forksSelect.value !== "") {
          parts.push(`forks: ${forksSelect.value}+`);
        }

        if (parts.length === 0) {
          statsElement.textContent = `Showing all ${sortedOrgs.length} organizations`;
        } else {
          statsElement.textContent = `Filtered by ${parts.join(", ")}`;
        }
      }
      updateFilterStats();

      const loadingEl = document.getElementById("chart-loading");
      if (loadingEl) loadingEl.remove();
      contributorNetworkVisual(values);

      const formatDateLong = d3.utcFormat("%B %-e, %Y");
      const most_recent_commit = d3.max(
        values[2],
        (d) => +(d.commit_sec_max ?? 0)
      );
      if (most_recent_commit) {
        const commitDate = new Date(most_recent_commit * 1000);
        document.getElementById("last-commit-date")!.innerHTML =
          `Including commits up to ${formatDateLong(commitDate)}`;
      }
    })
    .catch((err) => {
      console.error("Error loading data:", err);
      document.getElementById("chart-container")!.innerHTML =
        '<p style="color: red; padding: 20px;">Error loading data files. Make sure CSV files exist in data/.</p>';
    });
});

const filterToggle = document.getElementById("filter-toggle");
const filterHeader = document.getElementById("filter-header");
if (filterToggle && filterHeader) {
  filterToggle.addEventListener("click", () => {
    const expanded = filterToggle.getAttribute("aria-expanded") === "true";
    filterToggle.setAttribute("aria-expanded", String(!expanded));
    filterHeader.classList.toggle("collapsed", expanded);
  });
}

let resizeTimer: ReturnType<typeof setTimeout> | null = null;
window.addEventListener("resize", function () {
  if (resizeTimer) clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    if (contributorNetworkVisual) {
      const newSize = getChartDimensions();
      container.style.height = newSize + "px";
      contributorNetworkVisual.width(newSize).height(newSize).resize();
    }
  }, 300);
});
