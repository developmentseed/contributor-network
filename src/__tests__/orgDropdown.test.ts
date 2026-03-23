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
    expect(trigger!.textContent).toContain('Filter by org');
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
    const trigger = container.querySelector('[aria-haspopup="listbox"]') as HTMLElement;
    trigger.click();
    const options = container.querySelectorAll('[role="option"]');
    (options[0] as HTMLElement).click();
    (options[0] as HTMLElement).click();
    expect(onFilterChange).toHaveBeenCalledWith('alpha', false);
    expect(dropdown.getSelected()).toEqual([]);
  });

  it('shows counter label when orgs are selected', () => {
    createOrgDropdown({
      container,
      organizations: ['alpha', 'beta', 'gamma'],
      onFilterChange,
    });
    const trigger = container.querySelector('[aria-haspopup="listbox"]') as HTMLElement;
    trigger.click();
    const options = container.querySelectorAll('[role="option"]');
    (options[0] as HTMLElement).click();
    expect(trigger.textContent).toContain('1 org selected');
    (options[1] as HTMLElement).click();
    expect(trigger.textContent).toContain('2 orgs selected');
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

describe('destroy', () => {
  it('removes DOM elements and cleans up listeners', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const dropdown = createOrgDropdown({
      container,
      organizations: ['alpha'],
      onFilterChange: vi.fn(),
    });
    expect(container.querySelector('[aria-haspopup="listbox"]')).not.toBeNull();
    dropdown.destroy();
    expect(container.querySelector('[aria-haspopup="listbox"]')).toBeNull();
    container.remove();
  });
});

describe('keyboard navigation', () => {
  let container: HTMLDivElement;
  let onFilterChange: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    onFilterChange = vi.fn();
    createOrgDropdown({
      container,
      organizations: ['alpha', 'beta', 'gamma'],
      onFilterChange,
    });
  });

  afterEach(() => {
    container.remove();
  });

  it('opens flyout on Enter key', () => {
    const trigger = container.querySelector('[aria-haspopup="listbox"]') as HTMLElement;
    trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
  });

  it('closes flyout on Escape key', () => {
    const trigger = container.querySelector('[aria-haspopup="listbox"]') as HTMLElement;
    trigger.click(); // open
    trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
  });

  it('navigates options with ArrowDown/ArrowUp', () => {
    const trigger = container.querySelector('[aria-haspopup="listbox"]') as HTMLElement;
    trigger.click(); // open — focuses options[0]
    const flyout = container.querySelector('[role="listbox"]') as HTMLElement;
    const options = container.querySelectorAll('[role="option"]');
    expect(document.activeElement).toBe(options[0]);
    flyout.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    expect(document.activeElement).toBe(options[1]);
  });

  it('toggles selection with Space on focused option', () => {
    const trigger = container.querySelector('[aria-haspopup="listbox"]') as HTMLElement;
    trigger.click();
    const options = container.querySelectorAll('[role="option"]');
    (options[0] as HTMLElement).focus();
    options[0].dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
    expect(onFilterChange).toHaveBeenCalledWith('alpha', true);
  });
});
