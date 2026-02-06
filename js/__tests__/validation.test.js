/**
 * Validation Utilities Tests
 */

import { describe, it, expect } from 'vitest';
import {
  VALID_NODE_TYPES,
  isValidNode,
  isValidLink,
  getLinkNodeId,
  isPositioned,
  filterValidNodes,
  filterValidLinks,
  resolveLinkReferences
} from '../utils/validation.js';

describe('VALID_NODE_TYPES', () => {
  it('should contain expected node types', () => {
    expect(VALID_NODE_TYPES.has('contributor')).toBe(true);
    expect(VALID_NODE_TYPES.has('repo')).toBe(true);
    expect(VALID_NODE_TYPES.has('owner')).toBe(true);
    expect(VALID_NODE_TYPES.has('unknown')).toBe(false);
  });
});

describe('isValidNode', () => {
  it('should return true for valid nodes', () => {
    const node = { id: 'test', type: 'contributor', x: 100, y: 200 };
    expect(isValidNode(node)).toBe(true);
  });

  it('should return false for nodes without id', () => {
    const node = { type: 'contributor', x: 100, y: 200 };
    expect(isValidNode(node)).toBeFalsy();
  });

  it('should return false for nodes with invalid type', () => {
    const node = { id: 'test', type: 'invalid', x: 100, y: 200 };
    expect(isValidNode(node)).toBe(false);
  });

  it('should return false for nodes with non-finite coordinates', () => {
    expect(isValidNode({ id: 'test', type: 'repo', x: NaN, y: 200 })).toBe(false);
    expect(isValidNode({ id: 'test', type: 'repo', x: 100, y: Infinity })).toBe(false);
  });

  it('should return false for null or undefined', () => {
    expect(isValidNode(null)).toBeFalsy();
    expect(isValidNode(undefined)).toBeFalsy();
  });
});

describe('isValidLink', () => {
  const validSource = { id: 's1', type: 'contributor', x: 0, y: 0 };
  const validTarget = { id: 't1', type: 'repo', x: 100, y: 100 };

  it('should return true for valid links', () => {
    const link = { source: validSource, target: validTarget };
    expect(isValidLink(link)).toBe(true);
  });

  it('should return false for links with invalid source', () => {
    const link = { source: null, target: validTarget };
    expect(isValidLink(link)).toBeFalsy();
  });

  it('should return false for links with invalid target', () => {
    const link = { source: validSource, target: { id: 'bad' } };
    expect(isValidLink(link)).toBe(false);
  });
});

describe('getLinkNodeId', () => {
  it('should return id from node object', () => {
    expect(getLinkNodeId({ id: 'test', name: 'Test' })).toBe('test');
  });

  it('should return string reference directly', () => {
    expect(getLinkNodeId('test-string')).toBe('test-string');
  });

  it('should handle null', () => {
    expect(getLinkNodeId(null)).toBe(null);
  });
});

describe('isPositioned', () => {
  it('should return true for positioned nodes', () => {
    expect(isPositioned({ x: 0, y: 0 })).toBe(true);
    expect(isPositioned({ x: 100, y: -50 })).toBe(true);
  });

  it('should return false for unpositioned nodes', () => {
    expect(isPositioned({ x: NaN, y: 0 })).toBeFalsy();
    expect(isPositioned({ y: 0 })).toBeFalsy();
    expect(isPositioned(null)).toBeFalsy();
  });
});

describe('filterValidNodes', () => {
  const nodes = [
    { id: 'a', type: 'contributor', x: 0, y: 0 },
    { id: 'b', type: 'repo', x: 100, y: 100 },
    { id: 'c', type: 'invalid', x: 50, y: 50 },
    { id: 'd', type: 'owner', x: NaN, y: 0 },
    null
  ];

  it('should filter to only valid positioned nodes', () => {
    const result = filterValidNodes(nodes);
    expect(result).toHaveLength(2);
    expect(result.map(n => n.id)).toEqual(['a', 'b']);
  });

  it('should allow unpositioned nodes when requirePosition is false', () => {
    const unpositioned = [
      { id: 'a', type: 'contributor' },
      { id: 'b', type: 'repo' }
    ];
    const result = filterValidNodes(unpositioned, { requirePosition: false });
    expect(result).toHaveLength(2);
  });

  it('should handle empty array', () => {
    expect(filterValidNodes([])).toEqual([]);
  });

  it('should handle non-array input', () => {
    expect(filterValidNodes(null)).toEqual([]);
  });
});

describe('filterValidLinks', () => {
  const validNodeIds = new Set(['a', 'b', 'c']);
  const links = [
    { source: 'a', target: 'b' },
    { source: 'b', target: 'c' },
    { source: 'a', target: 'x' }, // x is invalid
    { source: { id: 'a' }, target: { id: 'b' } }, // object refs
    null
  ];

  it('should filter to links with valid endpoints', () => {
    const result = filterValidLinks(links, validNodeIds);
    expect(result).toHaveLength(3);
  });

  it('should handle empty array', () => {
    expect(filterValidLinks([], validNodeIds)).toEqual([]);
  });
});

describe('resolveLinkReferences', () => {
  const nodes = [
    { id: 'a', type: 'contributor', x: 0, y: 0 },
    { id: 'b', type: 'repo', x: 100, y: 100 }
  ];

  it('should resolve string references to node objects', () => {
    const links = [{ source: 'a', target: 'b', weight: 5 }];
    const result = resolveLinkReferences(links, nodes);

    expect(result).toHaveLength(1);
    expect(result[0].source.id).toBe('a');
    expect(result[0].target.id).toBe('b');
    expect(result[0].weight).toBe(5);
  });

  it('should keep already-resolved references', () => {
    const links = [{ source: nodes[0], target: nodes[1] }];
    const result = resolveLinkReferences(links, nodes);

    expect(result).toHaveLength(1);
    expect(result[0].source).toBe(nodes[0]);
  });

  it('should remove unresolved links by default', () => {
    const links = [
      { source: 'a', target: 'b' },
      { source: 'a', target: 'nonexistent' }
    ];
    const result = resolveLinkReferences(links, nodes);

    expect(result).toHaveLength(1);
  });

  it('should call onUnresolved callback', () => {
    const unresolved = [];
    const links = [{ source: 'a', target: 'bad' }];

    resolveLinkReferences(links, nodes, {
      onUnresolved: (type, id) => unresolved.push({ type, id })
    });

    expect(unresolved).toHaveLength(1);
    expect(unresolved[0]).toEqual({ type: 'target', id: 'bad' });
  });
});
