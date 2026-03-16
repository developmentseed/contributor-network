import * as d3 from "d3";
import { createContributorNetworkVisual } from "./chart";
import { MOBILE_BREAKPOINT, MOBILE_DRAWER_PEEK_HEIGHT } from './config/theme';

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

function getChartDimensions(): { width: number; height: number } {
  if (window.innerWidth <= MOBILE_BREAKPOINT) {
    const availableHeight = window.innerHeight - MOBILE_DRAWER_PEEK_HEIGHT;
    // Square canvas sized to height — overflows width, user pans to explore
    return { width: availableHeight, height: availableHeight };
  }
  const wrapperRect = wrapper.getBoundingClientRect();
  let availableWidth = wrapperRect.width - 40;
  if (availableWidth < 400) {
    availableWidth = Math.min(window.innerWidth - 40, 1400 - 40);
  }
  const s = Math.max(availableWidth, 320);
  return { width: s, height: s };
}

let dims = getChartDimensions();
container.style.height = dims.height + "px";

const contributorNetworkVisual = createContributorNetworkVisual(
  container,
  contributor_padding,
  masterContributors,
  displayNameToUsername,
  orgNickname,
);
contributorNetworkVisual.width(dims.width).height(dims.height);

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
      setupMobileLayout();

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

function setupMobileLayout(): void {
  if (window.innerWidth > MOBILE_BREAKPOINT) return;

  // Move intro content into info overlay
  const infoContent = document.getElementById('mobile-info-content')!;
  const chartTitle = document.getElementById('chart-title')!;
  const chartIntroText = document.getElementById('chart-intro-text')!;
  infoContent.appendChild(chartTitle);
  infoContent.appendChild(chartIntroText);

  // Move filters into drawer (#filter-stats is a child of #filter-header, so it moves too)
  const drawerFilters = document.getElementById('mobile-drawer-filters')!;
  const filterHeader = document.getElementById('filter-header')!;
  drawerFilters.appendChild(filterHeader);
  filterHeader.classList.remove('collapsed');

  // Info overlay open/close
  const infoBtn = document.getElementById('mobile-info-btn')!;
  const infoOverlay = document.getElementById('mobile-info-overlay')!;
  const infoClose = document.getElementById('mobile-info-close')!;

  infoBtn.addEventListener('click', () => infoOverlay.classList.add('active'));
  infoClose.addEventListener('click', () => infoOverlay.classList.remove('active'));
  infoOverlay.addEventListener('click', (e) => {
    if (e.target === infoOverlay) infoOverlay.classList.remove('active');
  });

  // Drawer expand/collapse
  const drawer = document.getElementById('mobile-drawer')!;
  const drawerHandle = document.getElementById('mobile-drawer-handle')!;

  drawerHandle.addEventListener('click', () => {
    if (drawer.dataset.mode === 'tooltip') return;
    const expanded = drawer.dataset.expanded === 'true';
    drawer.dataset.expanded = String(!expanded);
    drawerHandle.setAttribute('aria-expanded', String(!expanded));
  });

  // Swipe gestures on drawer
  let touchStartY = 0;
  let touchStartTime = 0;
  const SWIPE_THRESHOLD = 30;

  drawer.addEventListener('touchstart', (e: TouchEvent) => {
    touchStartY = e.touches[0].clientY;
    touchStartTime = Date.now();
  }, { passive: true });

  drawer.addEventListener('touchend', (e: TouchEvent) => {
    const deltaY = e.changedTouches[0].clientY - touchStartY;
    const elapsed = Date.now() - touchStartTime;
    if (elapsed > 300 || Math.abs(deltaY) < SWIPE_THRESHOLD) return;

    if (deltaY < 0) {
      // Swipe up → expand
      if (drawer.dataset.mode === 'filters') {
        drawer.dataset.expanded = 'true';
        drawerHandle.setAttribute('aria-expanded', 'true');
      }
    } else {
      // Swipe down → collapse or dismiss tooltip
      if (drawer.dataset.mode === 'tooltip') {
        document.getElementById('mobile-drawer-tooltip-close')?.click();
      } else {
        drawer.dataset.expanded = 'false';
        drawerHandle.setAttribute('aria-expanded', 'false');
      }
    }
  }, { passive: true });

  // Pan hint — show once on first visit
  const PAN_HINT_KEY = 'cn-pan-hint-shown';
  if (!localStorage.getItem(PAN_HINT_KEY)) {
    const hint = document.getElementById('mobile-pan-hint');
    if (hint) {
      hint.style.display = 'flex';
      localStorage.setItem(PAN_HINT_KEY, '1');
      setTimeout(() => hint.remove(), 3000);
    }
  }
}

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
      const newDims = getChartDimensions();
      container.style.height = newDims.height + "px";
      contributorNetworkVisual.width(newDims.width).height(newDims.height).resize();
    }
  }, 300);
});
