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

export function createOrgDropdown(_options: OrgDropdownOptions): OrgDropdown {
  return {
    getSelected: () => [],
    clearAll: () => {},
    destroy: () => {},
    setFlyoutDirection: () => {},
  };
}
