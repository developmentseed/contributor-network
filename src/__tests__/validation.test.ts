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
} from '../utils/validation';
import type { VisualizationNode, LinkData } from '../types';

describe('VALID_NODE_TYPES', () => {
  it('should contain expected node types', () => {
    expect(VALID_NODE_TYPES.has('contributor')).toBe(true);
    expect(VALID_NODE_TYPES.has('repo')).toBe(true);
    expect(VALID_NODE_TYPES.has('owner')).toBe(true);
    expect(VALID_NODE_TYPES.has('unknown' as never)).toBe(false);
  });
});

describe('isValidNode', () => {
  it('should return true for valid nodes', () => {
    const node = { id: 'test', type: 'contributor' as const, x: 100, y: 200 };
    expect(isValidNode(node as Partial<VisualizationNode>)).toBe(true);
  });

  it('should return false for nodes without id', () => {
    const node = { type: 'contributor' as const, x: 100, y: 200 };
    expect(isValidNode(node as Partial<VisualizationNode>)).toBeFalsy();
  });

  it('should return false for nodes with invalid type', () => {
    const node = { id: 'test', type: 'invalid', x: 100, y: 200 };
    expect(isValidNode(node as Partial<VisualizationNode>)).toBe(false);
  });

  it('should return false for nodes with non-finite coordinates', () => {
    expect(isValidNode({ id: 'test', type: 'repo', x: NaN, y: 200 } as Partial<VisualizationNode>)).toBe(false);
    expect(isValidNode({ id: 'test', type: 'repo', x: 100, y: Infinity } as Partial<VisualizationNode>)).toBe(false);
  });

  it('should return false for null or undefined', () => {
    expect(isValidNode(null)).toBeFalsy();
    expect(isValidNode(undefined)).toBeFalsy();
  });
});

describe('isValidLink', () => {
  const validSource = { id: 's1', type: 'contributor' as const, x: 0, y: 0 } as VisualizationNode;
  const validTarget = { id: 't1', type: 'repo' as const, x: 100, y: 100 } as VisualizationNode;

  it('should return true for valid links', () => {
    const link = { source: validSource, target: validTarget } as LinkData;
    expect(isValidLink(link)).toBe(true);
  });

  it('should return false for links with invalid source', () => {
    const link = { source: null, target: validTarget } as unknown as LinkData;
    expect(isValidLink(link)).toBeFalsy();
  });

  it('should return false for links with invalid target', () => {
    const link = { source: validSource, target: { id: 'bad' } } as unknown as LinkData;
    expect(isValidLink(link)).toBe(false);
  });
});

describe('getLinkNodeId', () => {
  it('should return id from node object', () => {
    expect(getLinkNodeId({ id: 'test', name: 'Test' } as { id: string })).toBe('test');
  });

  it('should return string reference directly', () => {
    expect(getLinkNodeId('test-string')).toBe('test-string');
  });

  it('should handle null', () => {
    expect(getLinkNodeId(null as unknown as string)).toBe(null);
  });
});

describe('isPositioned', () => {
  it('should return true for positioned nodes', () => {
    expect(isPositioned({ x: 0, y: 0 } as Partial<VisualizationNode>)).toBe(true);
    expect(isPositioned({ x: 100, y: -50 } as Partial<VisualizationNode>)).toBe(true);
  });

  it('should return false for unpositioned nodes', () => {
    expect(isPositioned({ x: NaN, y: 0 } as Partial<VisualizationNode>)).toBeFalsy();
    expect(isPositioned({ y: 0 } as Partial<VisualizationNode>)).toBeFalsy();
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
  ] as unknown as VisualizationNode[];

  it('should filter to only valid positioned nodes', () => {
    const result = filterValidNodes(nodes);
    expect(result).toHaveLength(2);
    expect(result.map((n: VisualizationNode) => n.id)).toEqual(['a', 'b']);
  });

  it('should allow unpositioned nodes when requirePosition is false', () => {
    const unpositioned = [
      { id: 'a', type: 'contributor' },
      { id: 'b', type: 'repo' }
    ] as unknown as VisualizationNode[];
    const result = filterValidNodes(unpositioned, { requirePosition: false });
    expect(result).toHaveLength(2);
  });

  it('should handle empty array', () => {
    expect(filterValidNodes([])).toEqual([]);
  });

  it('should handle non-array input', () => {
    expect(filterValidNodes(null as unknown as VisualizationNode[])).toEqual([]);
  });
});

describe('filterValidLinks', () => {
  const validNodeIds = new Set(['a', 'b', 'c']);
  const links = [
    { source: 'a', target: 'b' },
    { source: 'b', target: 'c' },
    { source: 'a', target: 'x' },
    { source: { id: 'a' }, target: { id: 'b' } },
    null
  ] as unknown as LinkData[];

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
  ] as unknown as VisualizationNode[];

  it('should resolve string references to node objects', () => {
    const links = [{ source: 'a', target: 'b', weight: 5 }] as unknown as LinkData[];
    const result = resolveLinkReferences(links, nodes);

    expect(result).toHaveLength(1);
    expect((result[0].source as VisualizationNode).id).toBe('a');
    expect((result[0].target as VisualizationNode).id).toBe('b');
    expect((result[0] as LinkData & { weight: number }).weight).toBe(5);
  });

  it('should keep already-resolved references', () => {
    const links = [{ source: nodes[0], target: nodes[1] }] as unknown as LinkData[];
    const result = resolveLinkReferences(links, nodes);

    expect(result).toHaveLength(1);
    expect(result[0].source).toBe(nodes[0]);
  });

  it('should remove unresolved links by default', () => {
    const links = [
      { source: 'a', target: 'b' },
      { source: 'a', target: 'nonexistent' }
    ] as unknown as LinkData[];
    const result = resolveLinkReferences(links, nodes);

    expect(result).toHaveLength(1);
  });

  it('should call onUnresolved callback', () => {
    const unresolved: Array<{ type: string; id: string }> = [];
    const links = [{ source: 'a', target: 'bad' }] as unknown as LinkData[];

    resolveLinkReferences(links, nodes, {
      onUnresolved: (type: string, id: any) => unresolved.push({ type, id })
    });

    expect(unresolved).toHaveLength(1);
    expect(unresolved[0]).toEqual({ type: 'target', id: 'bad' });
  });
});
