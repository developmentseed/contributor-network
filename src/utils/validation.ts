/**
 * Validation Utilities
 *
 * Functions for validating node and link data integrity.
 * Used to prevent rendering crashes during filtering operations.
 *
 * @module utils/validation
 */

import type { NodeType, VisualizationNode, LinkData } from '../types';

/**
 * Valid node types in the contributor network.
 */
export const VALID_NODE_TYPES: Set<NodeType> = new Set<NodeType>(['contributor', 'repo', 'owner']);

/**
 * Check if a node has valid positioning data.
 *
 * A valid node must have:
 * - An id property
 * - A type that is 'contributor', 'repo', or 'owner'
 * - Finite x and y coordinates
 *
 * @param {Object} node - The node to validate
 * @returns {boolean} True if node is valid and positioned
 */
export function isValidNode(node: Partial<VisualizationNode> | null | undefined): boolean {
  return (
    !!node &&
    !!node.id &&
    VALID_NODE_TYPES.has(node.type as NodeType) &&
    typeof node.x === 'number' &&
    typeof node.y === 'number' &&
    isFinite(node.x) &&
    isFinite(node.y)
  );
}

/**
 * Check if a link has valid source and target nodes.
 *
 * @param {Object} link - The link to validate
 * @returns {boolean} True if link is valid
 */
export function isValidLink(link: LinkData | null | undefined): boolean {
  return (
    !!link &&
    !!link.source &&
    !!link.target &&
    isValidNode(link.source as VisualizationNode) &&
    isValidNode(link.target as VisualizationNode)
  );
}

/**
 * Get the ID from a link's source or target.
 *
 * D3's forceLink converts string refs to object refs during simulation,
 * so we need to handle both cases when comparing link endpoints.
 *
 * @param {string|Object} ref - The source or target reference
 * @returns {string} The node ID
 */
export function getLinkNodeId(ref: string | { id: string }): string {
  return (typeof ref === 'object' && ref !== null) ? ref.id : ref;
}

/**
 * Check if a node has been positioned by a force simulation.
 *
 * @param {Object} node - The node to check
 * @returns {boolean} True if the node has valid x,y coordinates
 */
export function isPositioned(node: Partial<VisualizationNode> | null | undefined): boolean {
  return (
    !!node &&
    typeof node.x === 'number' &&
    typeof node.y === 'number' &&
    isFinite(node.x) &&
    isFinite(node.y)
  );
}

interface FilterValidNodesOptions {
  requirePosition?: boolean;
}

/**
 * Validate an array of nodes and return only valid ones.
 *
 * @param {Array} nodes - Array of nodes to validate
 * @param {Object} options - Validation options
 * @param {boolean} options.requirePosition - Require valid x,y coordinates
 * @returns {Array} Array of valid nodes
 */
export function filterValidNodes(
  nodes: VisualizationNode[],
  options: FilterValidNodesOptions = {}
): VisualizationNode[] {
  const { requirePosition = true } = options;

  if (!Array.isArray(nodes)) {
    return [];
  }

  return nodes.filter(node => {
    if (!node || !node.id) return false;
    if (!VALID_NODE_TYPES.has(node.type)) return false;
    if (requirePosition && !isPositioned(node)) return false;
    return true;
  });
}

/**
 * Validate an array of links and return only valid ones.
 *
 * @param {Array} links - Array of links to validate
 * @param {Set} validNodeIds - Set of valid node IDs
 * @returns {Array} Array of valid links
 */
export function filterValidLinks(links: LinkData[], validNodeIds: Set<string>): LinkData[] {
  if (!Array.isArray(links)) {
    return [];
  }

  return links.filter(link => {
    if (!link) return false;

    const sourceId = getLinkNodeId(link.source as string | { id: string });
    const targetId = getLinkNodeId(link.target as string | { id: string });

    return validNodeIds.has(sourceId) && validNodeIds.has(targetId);
  });
}

interface ResolveLinkReferencesOptions {
  removeUnresolved?: boolean;
  onUnresolved?: ((endpoint: string, ref: string | VisualizationNode) => void) | null;
}

/**
 * Resolves string references in links to actual node objects.
 *
 * After force simulations, some links may still have source/target as string IDs
 * instead of node object references. This function converts them.
 *
 * @param {Array} links - Array of links to resolve
 * @param {Array} nodes - Array of nodes to reference
 * @param {Object} options - Options for resolution
 * @param {boolean} options.removeUnresolved - Remove links that can't be resolved
 * @param {Function} options.onUnresolved - Callback for unresolved references
 * @returns {Array} Array of links with resolved references
 */
export function resolveLinkReferences(
  links: LinkData[],
  nodes: VisualizationNode[],
  options: ResolveLinkReferencesOptions = {}
): LinkData[] {
  const { removeUnresolved = true, onUnresolved = null } = options;

  const nodeMap = new Map<string, VisualizationNode>(nodes.map(n => [n.id, n]));
  const resolved: LinkData[] = [];

  for (const link of links) {
    let sourceNode: VisualizationNode | string | null | undefined = link.source;
    let targetNode: VisualizationNode | string | null | undefined = link.target;

    if (typeof sourceNode === 'string') {
      sourceNode = nodeMap.get(sourceNode);
      if (!sourceNode && onUnresolved) {
        onUnresolved('source', link.source);
      }
    }

    if (typeof targetNode === 'string') {
      targetNode = nodeMap.get(targetNode);
      if (!targetNode && onUnresolved) {
        onUnresolved('target', link.target);
      }
    }

    if (
      sourceNode &&
      targetNode &&
      typeof sourceNode === 'object' &&
      typeof targetNode === 'object' &&
      sourceNode.id &&
      targetNode.id
    ) {
      resolved.push({
        ...link,
        source: sourceNode,
        target: targetNode
      });
    } else if (!removeUnresolved) {
      resolved.push({
        ...link,
        source: (sourceNode as VisualizationNode) || null,
        target: (targetNode as VisualizationNode) || null
      } as LinkData);
    }
  }

  return resolved;
}
