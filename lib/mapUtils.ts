import { Map } from '@/lib/schemas/map';

/**
 * Parse a path-based node ID into its components
 * e.g., "root-0-1" -> ["root", "0", "1"]
 */
export function parseNodePath(nodeId: string): string[] {
  return nodeId.split('-');
}

/**
 * Get the parent ID from a node ID
 * e.g., "root-0-1" -> "root-0", "root-0" -> "root", "root" -> null
 */
export function getParentId(nodeId: string): string | null {
  const parts = parseNodePath(nodeId);
  if (parts.length <= 1) return null;
  return parts.slice(0, -1).join('-');
}

/**
 * Check if nodeA is an ancestor of nodeB
 * e.g., "root-0" is ancestor of "root-0-1"
 */
export function isAncestor(ancestorId: string, descendantId: string): boolean {
  return descendantId.startsWith(ancestorId + '-');
}

/**
 * Get the index of a node within its parent's sections array
 * e.g., "root-0-2" -> 2
 */
export function getNodeIndex(nodeId: string): number {
  const parts = parseNodePath(nodeId);
  const lastPart = parts[parts.length - 1];
  return lastPart === 'root' ? -1 : parseInt(lastPart, 10);
}

/**
 * Filter selected nodes to remove redundant children
 * If a parent is selected, its children are not needed
 */
export function filterRedundantNodes(nodeIds: string[]): string[] {
  return nodeIds.filter(nodeId => {
    // Check if any other selected node is an ancestor of this one
    return !nodeIds.some(otherId =>
      otherId !== nodeId && isAncestor(otherId, nodeId)
    );
  });
}

/**
 * Get a node from the map tree by its path-based ID
 */
export function getNodeByPath(map: Map, nodeId: string): Map | null {
  if (nodeId === 'root') return map;

  const parts = parseNodePath(nodeId);
  if (parts[0] !== 'root') return null;

  let current = map;
  for (let i = 1; i < parts.length; i++) {
    const index = parseInt(parts[i], 10);
    if (!current.sections || index >= current.sections.length) {
      return null;
    }
    current = current.sections[index];
  }

  return current;
}

/**
 * Deep clone a map object
 */
export function cloneMap(map: Map): Map {
  return JSON.parse(JSON.stringify(map));
}

/**
 * Replace a node in the map tree with new content
 * Returns a new map with the replacement applied
 */
export function replaceNodeInMap(
  map: Map,
  nodeId: string,
  replacement: Map
): Map {
  const newMap = cloneMap(map);

  if (nodeId === 'root') {
    return replacement;
  }

  const parentId = getParentId(nodeId);
  if (!parentId) return newMap;

  const parent = getNodeByPath(newMap, parentId);
  if (!parent || !parent.sections) return newMap;

  const index = getNodeIndex(nodeId);
  if (index >= 0 && index < parent.sections.length) {
    parent.sections[index] = replacement;
  }

  return newMap;
}

/**
 * Replace multiple sibling nodes with new nodes
 * nodeIds should all be siblings (same parent)
 * Replaces the range of selected nodes with the replacements
 */
export function replaceSiblingNodesInMap(
  map: Map,
  nodeIds: string[],
  replacements: Map[]
): Map {
  if (nodeIds.length === 0) return map;

  const newMap = cloneMap(map);
  const parentId = getParentId(nodeIds[0]);

  if (!parentId) {
    // Handle root replacement
    if (nodeIds.includes('root')) {
      return replacements[0] || map;
    }
    return newMap;
  }

  const parent = getNodeByPath(newMap, parentId);
  if (!parent || !parent.sections) return newMap;

  // Get indices and sort them
  const indices = nodeIds.map(getNodeIndex).sort((a, b) => a - b);
  const minIndex = indices[0];
  const maxIndex = indices[indices.length - 1];

  // Remove the selected nodes and insert replacements
  parent.sections.splice(minIndex, maxIndex - minIndex + 1, ...replacements);

  return newMap;
}
