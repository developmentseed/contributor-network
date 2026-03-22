// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createOrgDropdown } from '../ui/orgDropdown';

describe('createOrgDropdown', () => {
  let container: HTMLDivElement;
  let onFilterChange: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    onFilterChange = vi.fn();
  });

  afterEach(() => {
    container.remove();
  });

  it('renders trigger with placeholder when no orgs selected', () => {
    const dropdown = createOrgDropdown({
      container,
      organizations: ['alpha', 'beta', 'gamma'],
      onFilterChange,
    });
    const trigger = container.querySelector('[aria-haspopup="listbox"]');
    expect(trigger).not.toBeNull();
    expect(trigger!.textContent).toContain('+ add org...');
    expect(dropdown.getSelected()).toEqual([]);
  });

  it('renders disabled state when organizations list is empty', () => {
    createOrgDropdown({
      container,
      organizations: [],
      onFilterChange,
    });
    const trigger = container.querySelector('[aria-haspopup="listbox"]');
    expect(trigger!.textContent).toContain('No organizations available');
    expect(trigger!.getAttribute('aria-disabled')).toBe('true');
  });

  it('opens flyout on trigger click', () => {
    createOrgDropdown({
      container,
      organizations: ['alpha', 'beta'],
      onFilterChange,
    });
    const trigger = container.querySelector('[aria-haspopup="listbox"]') as HTMLElement;
    trigger.click();
    const flyout = container.querySelector('[role="listbox"]');
    expect(flyout).not.toBeNull();
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
  });

  it('selects an org via checkbox click', () => {
    const dropdown = createOrgDropdown({
      container,
      organizations: ['alpha', 'beta'],
      onFilterChange,
    });
    const trigger = container.querySelector('[aria-haspopup="listbox"]') as HTMLElement;
    trigger.click();
    const options = container.querySelectorAll('[role="option"]');
    (options[0] as HTMLElement).click();
    expect(onFilterChange).toHaveBeenCalledWith('alpha', true);
    expect(dropdown.getSelected()).toEqual(['alpha']);
  });

  it('deselects an org via checkbox click', () => {
    const dropdown = createOrgDropdown({
      container,
      organizations: ['alpha', 'beta'],
      onFilterChange,
    });
    // Select then deselect
    const trigger = container.querySelector('[aria-haspopup="listbox"]') as HTMLElement;
    trigger.click();
    const options = container.querySelectorAll('[role="option"]');
    (options[0] as HTMLElement).click();
    (options[0] as HTMLElement).click();
    expect(onFilterChange).toHaveBeenCalledWith('alpha', false);
    expect(dropdown.getSelected()).toEqual([]);
  });

  it('removes org via pill close button', () => {
    const dropdown = createOrgDropdown({
      container,
      organizations: ['alpha', 'beta'],
      onFilterChange,
    });
    // Select alpha
    const trigger = container.querySelector('[aria-haspopup="listbox"]') as HTMLElement;
    trigger.click();
    const options = container.querySelectorAll('[role="option"]');
    (options[0] as HTMLElement).click();
    // Close flyout
    trigger.click();
    // Find pill close button
    const pillClose = container.querySelector('.org-pill-close') as HTMLElement;
    expect(pillClose).not.toBeNull();
    pillClose.click();
    expect(onFilterChange).toHaveBeenCalledWith('alpha', false);
  });

  it('clearAll removes all selections', () => {
    const dropdown = createOrgDropdown({
      container,
      organizations: ['alpha', 'beta'],
      onFilterChange,
    });
    const trigger = container.querySelector('[aria-haspopup="listbox"]') as HTMLElement;
    trigger.click();
    const options = container.querySelectorAll('[role="option"]');
    (options[0] as HTMLElement).click();
    (options[1] as HTMLElement).click();
    expect(dropdown.getSelected()).toEqual(['alpha', 'beta']);
    dropdown.clearAll();
    expect(dropdown.getSelected()).toEqual([]);
    expect(onFilterChange).toHaveBeenCalledWith('alpha', false);
    expect(onFilterChange).toHaveBeenCalledWith('beta', false);
  });

  it('shows clear all link when 2+ orgs selected', () => {
    createOrgDropdown({
      container,
      organizations: ['alpha', 'beta', 'gamma'],
      onFilterChange,
    });
    const trigger = container.querySelector('[aria-haspopup="listbox"]') as HTMLElement;
    trigger.click();
    const options = container.querySelectorAll('[role="option"]');
    (options[0] as HTMLElement).click();
    expect(container.querySelector('.org-dropdown-clear')).toBeNull();
    (options[1] as HTMLElement).click();
    expect(container.querySelector('.org-dropdown-clear')).not.toBeNull();
  });
});
