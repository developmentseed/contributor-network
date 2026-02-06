/**
 * Validation Utilities
 *
 * Functions for validating node and link data integrity.
 * Used to prevent rendering crashes during filtering operations.
 *
 * @module utils/validation
 */

/**
 * Valid node types in the contributor network.
 */
export const VALID_NODE_TYPES = new Set(['contributor', 'repo', 'owner']);

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
export function isValidNode(node) {
  return (
    node &&
    node.id &&
    VALID_NODE_TYPES.has(node.type) &&
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
export function isValidLink(link) {
  return (
    link &&
    link.source &&
    link.target &&
    isValidNode(link.source) &&
    isValidNode(link.target)
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
export function getLinkNodeId(ref) {
  return (typeof ref === 'object' && ref !== null) ? ref.id : ref;
}

/**
 * Check if a node has been positioned by a force simulation.
 *
 * @param {Object} node - The node to check
 * @returns {boolean} True if the node has valid x,y coordinates
 */
export function isPositioned(node) {
  return (
    node &&
    typeof node.x === 'number' &&
    typeof node.y === 'number' &&
    isFinite(node.x) &&
    isFinite(node.y)
  );
}

/**
 * Validate an array of nodes and return only valid ones.
 *
 * @param {Array} nodes - Array of nodes to validate
 * @param {Object} options - Validation options
 * @param {boolean} options.requirePosition - Require valid x,y coordinates
 * @returns {Array} Array of valid nodes
 */
export function filterValidNodes(nodes, options = {}) {
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
export function filterValidLinks(links, validNodeIds) {
  if (!Array.isArray(links)) {
    return [];
  }

  return links.filter(link => {
    if (!link) return false;

    const sourceId = getLinkNodeId(link.source);
    const targetId = getLinkNodeId(link.target);

    return validNodeIds.has(sourceId) && validNodeIds.has(targetId);
  });
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
export function resolveLinkReferences(links, nodes, options = {}) {
  const { removeUnresolved = true, onUnresolved = null } = options;

  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  const resolved = [];

  for (const link of links) {
    let sourceNode = link.source;
    let targetNode = link.target;

    // Resolve source if it's a string
    if (typeof sourceNode === 'string') {
      sourceNode = nodeMap.get(sourceNode);
      if (!sourceNode && onUnresolved) {
        onUnresolved('source', link.source);
      }
    }

    // Resolve target if it's a string
    if (typeof targetNode === 'string') {
      targetNode = nodeMap.get(targetNode);
      if (!targetNode && onUnresolved) {
        onUnresolved('target', link.target);
      }
    }

    // Check if both endpoints are valid
    if (sourceNode && targetNode && sourceNode.id && targetNode.id) {
      resolved.push({
        ...link,
        source: sourceNode,
        target: targetNode
      });
    } else if (!removeUnresolved) {
      // Keep the link with updated references (may be null)
      resolved.push({
        ...link,
        source: sourceNode || null,
        target: targetNode || null
      });
    }
  }

  return resolved;
}
