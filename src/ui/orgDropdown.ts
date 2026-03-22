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
  let flyoutDirection: "up" | "down" = "down";

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
  flyout.style.display = "none";
  flyout.style.maxHeight = "240px";
  flyout.style.overflowY = "auto";

  // Populate flyout options
  if (organizations.length === 0) {
    const emptyOption = document.createElement("div");
    emptyOption.setAttribute("role", "option");
    emptyOption.setAttribute("aria-selected", "false");
    emptyOption.setAttribute("aria-disabled", "true");
    emptyOption.textContent = "No organizations available";
    flyout.appendChild(emptyOption);
  } else {
    for (const org of organizations) {
      const option = document.createElement("div");
      option.setAttribute("role", "option");
      option.setAttribute("aria-selected", "false");
      option.dataset.org = org;

      const checkbox = document.createElement("span");
      checkbox.className = "org-option-checkbox";
      const nameSpan = document.createElement("span");
      nameSpan.textContent = org;

      option.appendChild(checkbox);
      option.appendChild(nameSpan);

      option.addEventListener("click", () => {
        const isSelected = selectedOrgs.has(org);
        if (isSelected) {
          selectedOrgs.delete(org);
          option.setAttribute("aria-selected", "false");
          onFilterChange(org, false);
        } else {
          selectedOrgs.add(org);
          option.setAttribute("aria-selected", "true");
          onFilterChange(org, true);
        }
        renderTriggerContent();
      });

      flyout.appendChild(option);
    }
  }

  function renderTriggerContent(): void {
    trigger.innerHTML = "";

    if (organizations.length === 0) {
      trigger.textContent = "No organizations available";
      return;
    }

    if (selectedOrgs.size === 0) {
      trigger.textContent = "+ add org...";
      return;
    }

    // Render pills for each selected org
    for (const org of selectedOrgs) {
      const pill = document.createElement("span");
      pill.className = "org-pill";

      const nameSpan = document.createElement("span");
      nameSpan.textContent = org;
      nameSpan.style.maxWidth = "180px";
      nameSpan.style.overflow = "hidden";
      nameSpan.style.textOverflow = "ellipsis";
      nameSpan.style.whiteSpace = "nowrap";
      nameSpan.style.display = "inline-block";

      const closeBtn = document.createElement("button");
      closeBtn.className = "org-pill-close";
      closeBtn.textContent = "✕";
      closeBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        selectedOrgs.delete(org);
        onFilterChange(org, false);
        // Update flyout option aria-selected
        const optionEl = flyout.querySelector(`[data-org="${org}"]`);
        if (optionEl) {
          optionEl.setAttribute("aria-selected", "false");
        }
        renderTriggerContent();
      });

      pill.appendChild(nameSpan);
      pill.appendChild(closeBtn);
      trigger.appendChild(pill);
    }

    // Show clear all link when 2+ orgs selected
    if (selectedOrgs.size >= 2) {
      const clearLink = document.createElement("a");
      clearLink.className = "org-dropdown-clear";
      clearLink.href = "#";
      clearLink.textContent = "Clear all";
      clearLink.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        clearAll();
      });
      trigger.appendChild(clearLink);
    }
  }

  // Toggle flyout on trigger click
  trigger.addEventListener("click", () => {
    if (organizations.length === 0) return;
    const isOpen = flyout.style.display !== "none";
    if (isOpen) {
      flyout.style.display = "none";
      trigger.setAttribute("aria-expanded", "false");
    } else {
      flyout.style.display = "block";
      trigger.setAttribute("aria-expanded", "true");
    }
  });

  // Outside click handler
  const onOutsideClick = (e: MouseEvent) => {
    if (!wrapper.contains(e.target as Node)) {
      flyout.style.display = "none";
      trigger.setAttribute("aria-expanded", "false");
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
    flyoutDirection = direction;
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
