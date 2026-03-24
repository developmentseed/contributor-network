export interface OrgDropdownOptions {
  container: HTMLElement;
  organizations: string[];
  onFilterChange: (org: string, enabled: boolean) => void;
}

export interface OrgDropdown {
  getSelected: () => string[];
  clearAll: () => void;
  destroy: () => void;
  setFlyoutDirection: (direction: "up" | "down") => void;
}

export function createOrgDropdown(options: OrgDropdownOptions): OrgDropdown {
  const { container, organizations, onFilterChange } = options;

  const selectedOrgs = new Set<string>();
  // Create wrapper
  const wrapper = document.createElement("div");
  wrapper.className = "org-dropdown-wrapper";

  // Create micro-label
  const label = document.createElement("div");
  label.className = "filter-label";
  label.textContent = "Organizations";
  const labelId = `org-dropdown-label-${Math.random().toString(36).slice(2)}`;
  label.id = labelId;

  // Create trigger
  const trigger = document.createElement("div");
  trigger.className = "org-dropdown-trigger";
  trigger.setAttribute("aria-haspopup", "listbox");
  trigger.setAttribute("aria-expanded", "false");
  trigger.setAttribute("aria-labelledby", labelId);
  trigger.setAttribute("tabindex", "0");

  if (organizations.length === 0) {
    trigger.setAttribute("aria-disabled", "true");
  }

  // Create flyout
  const flyout = document.createElement("div");
  flyout.className = "org-dropdown-flyout";
  flyout.setAttribute("role", "listbox");

  // "All organizations" option (created early, appended only when orgs exist)
  let allOption: HTMLElement | null = null;

  // Populate flyout options
  if (organizations.length === 0) {
    const emptyOption = document.createElement("div");
    emptyOption.setAttribute("role", "option");
    emptyOption.setAttribute("aria-selected", "false");
    emptyOption.setAttribute("aria-disabled", "true");
    emptyOption.textContent = "No organizations available";
    flyout.appendChild(emptyOption);
  } else {
    // "All organizations" reset option
    allOption = document.createElement("div");
    allOption.className = "org-dropdown-flyout-item org-dropdown-all-option";
    allOption.setAttribute("role", "option");
    allOption.setAttribute("aria-selected", "false");
    allOption.setAttribute("tabindex", "-1");

    const allCheckbox = document.createElement("span");
    allCheckbox.className = "org-dropdown-checkbox";
    const allNameSpan = document.createElement("span");
    allNameSpan.textContent = "All organizations";

    allOption.appendChild(allCheckbox);
    allOption.appendChild(allNameSpan);

    allOption.addEventListener("click", () => {
      clearAll();
      closeFlyout();
    });
    allOption.addEventListener("keydown", (e: KeyboardEvent) => {
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        clearAll();
        closeFlyout();
      } else if (e.key === "Escape" || e.key === "Tab") {
        closeFlyout();
        trigger.focus();
      }
    });
    flyout.appendChild(allOption);

    for (const org of organizations) {
      const option = document.createElement("div");
      option.className = "org-dropdown-flyout-item";
      option.setAttribute("role", "option");
      option.setAttribute("aria-selected", "false");
      option.dataset.org = org;

      const checkbox = document.createElement("span");
      checkbox.className = "org-dropdown-checkbox";
      checkbox.textContent = "✓";
      const nameSpan = document.createElement("span");
      nameSpan.textContent = org;

      option.appendChild(checkbox);
      option.appendChild(nameSpan);

      option.setAttribute("tabindex", "-1");

      option.addEventListener("click", () => {
        toggleOption(org, option);
      });

      option.addEventListener("keydown", (e: KeyboardEvent) => {
        if (e.key === " " || e.key === "Enter") {
          e.preventDefault();
          toggleOption(org, option);
        } else if (e.key === "Escape" || e.key === "Tab") {
          closeFlyout();
          trigger.focus();
        }
      });

      flyout.appendChild(option);
    }
  }

  function updateAllOption(): void {
    if (!allOption) return;
    const checkbox = allOption.querySelector<HTMLElement>(".org-dropdown-checkbox");
    if (checkbox) {
      checkbox.textContent = selectedOrgs.size === 0 ? "✓" : "";
    }
    allOption.setAttribute("aria-selected", selectedOrgs.size === 0 ? "true" : "false");
  }

  function renderTriggerContent(): void {
    trigger.innerHTML = "";
    updateAllOption();

    if (organizations.length === 0) {
      trigger.textContent = "No organizations available";
      return;
    }

    if (selectedOrgs.size === 0) {
      const placeholder = document.createElement("span");
      placeholder.className = "org-dropdown-count";
      placeholder.textContent = "Filter by org";
      trigger.appendChild(placeholder);
      const chevron = document.createElement("span");
      chevron.className = "org-dropdown-chevron";
      chevron.textContent = "▾";
      trigger.appendChild(chevron);
      return;
    }

    // Show counter label
    const countLabel = document.createElement("span");
    countLabel.className = "org-dropdown-count";
    countLabel.textContent =
      selectedOrgs.size === 1
        ? `1 org selected`
        : `${selectedOrgs.size} orgs selected`;
    trigger.appendChild(countLabel);

    // Show clear all button when 2+ orgs selected
    if (selectedOrgs.size >= 2) {
      const clearLink = document.createElement("button");
      clearLink.className = "org-dropdown-clear";
      clearLink.textContent = "Clear all";
      clearLink.addEventListener("click", (e) => {
        e.stopPropagation();
        clearAll();
      });
      trigger.appendChild(clearLink);
    }

    // Chevron
    const chevron = document.createElement("span");
    chevron.className = "org-dropdown-chevron";
    chevron.textContent = "▾";
    trigger.appendChild(chevron);
  }

  function toggleOption(org: string, option: HTMLElement): void {
    const isSelected = selectedOrgs.has(org);
    const checkbox = option.querySelector<HTMLElement>(".org-dropdown-checkbox");
    if (isSelected) {
      selectedOrgs.delete(org);
      option.setAttribute("aria-selected", "false");
      if (checkbox) checkbox.textContent = "";
      onFilterChange(org, false);
    } else {
      selectedOrgs.add(org);
      option.setAttribute("aria-selected", "true");
      if (checkbox) checkbox.textContent = "✓";
      onFilterChange(org, true);
    }
    renderTriggerContent();
  }

  function openFlyout(): void {
    flyout.classList.add("open");
    trigger.setAttribute("aria-expanded", "true");
    const options = Array.from(flyout.querySelectorAll<HTMLElement>('[role="option"]:not([aria-disabled="true"])'));
    const firstSelected = options.find((o) => o.getAttribute("aria-selected") === "true");
    (firstSelected ?? options[0])?.focus();
  }

  function closeFlyout(): void {
    flyout.classList.remove("open");
    trigger.setAttribute("aria-expanded", "false");
  }

  function moveFocus(delta: number): void {
    const options = Array.from(flyout.querySelectorAll<HTMLElement>('[role="option"]:not([aria-disabled="true"])'));
    const current = options.indexOf(document.activeElement as HTMLElement);
    const next = (current + delta + options.length) % options.length;
    options[next]?.focus();
  }

  // Toggle flyout on trigger click
  trigger.addEventListener("click", () => {
    if (organizations.length === 0) return;
    const isOpen = flyout.classList.contains("open");
    if (isOpen) {
      closeFlyout();
    } else {
      openFlyout();
    }
  });

  // Keyboard navigation on trigger
  trigger.addEventListener("keydown", (e: KeyboardEvent) => {
    if (organizations.length === 0) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openFlyout();
    } else if (e.key === "Escape") {
      closeFlyout();
    }
  });

  // Keyboard navigation on flyout (for ArrowDown/ArrowUp dispatched on the listbox itself)
  flyout.addEventListener("keydown", (e: KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      moveFocus(1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      moveFocus(-1);
    } else if (e.key === "Escape") {
      closeFlyout();
      trigger.focus();
    }
  });

  // Outside click handler
  const onOutsideClick = (e: MouseEvent) => {
    if (!wrapper.contains(e.target as Node)) {
      closeFlyout();
    }
  };
  document.addEventListener("mousedown", onOutsideClick);

  // Assemble DOM
  wrapper.appendChild(label);
  wrapper.appendChild(trigger);
  wrapper.appendChild(flyout);
  container.appendChild(wrapper);

  // Initial render
  renderTriggerContent();

  function clearAll(): void {
    for (const org of selectedOrgs) {
      onFilterChange(org, false);
      const optionEl = flyout.querySelector(`[data-org="${org}"]`);
      if (optionEl) {
        optionEl.setAttribute("aria-selected", "false");
        const cb = optionEl.querySelector<HTMLElement>(".org-dropdown-checkbox");
        if (cb) cb.textContent = "";
      }
    }
    selectedOrgs.clear();
    renderTriggerContent();
  }

  function destroy(): void {
    document.removeEventListener("mousedown", onOutsideClick);
    wrapper.remove();
  }

  function setFlyoutDirection(direction: "up" | "down"): void {
    flyout.classList.remove("flyout-up", "flyout-down");
    flyout.classList.add(`flyout-${direction}`);
  }

  return {
    getSelected: () => Array.from(selectedOrgs),
    clearAll,
    destroy,
    setFlyoutDirection,
  };
}
