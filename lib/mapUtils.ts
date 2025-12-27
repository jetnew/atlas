import { Map } from '@/lib/schemas/map';

/**
 * Extracts the title from a Map object.
 * Returns null if no title is found.
 */
export function getMapTitle(map: Map | null | undefined): string | null {
  if (!map) return null;
  return map.title || null;
}

/**
 * Parses a markdown report string into structured map data.
 * Supports strict hierarchy with promotion for orphaned headings.
 */
export function parseReportToMap(reportText: string): Map {
  // Helper: Get heading level (0 if not a heading, 1-6 for #-######)
  const getHeadingLevel = (line: string): number => {
    const trimmed = line.trim();
    const match = trimmed.match(/^(#{1,6})\s/);
    return match ? match[1].length : 0;
  };

  // Helper: Extract heading text (remove # and trim)
  const extractHeadingText = (line: string): string => {
    return line.trim().replace(/^#{1,6}\s+/, '');
  };

  // Helper: Check if line is a horizontal rule (---, ***, ___)
  const isHorizontalRule = (line: string): boolean => {
    const trimmed = line.trim();
    return /^[-*_]{3,}$/.test(trimmed) || /^([-*_]\s*){3,}$/.test(trimmed);
  };

  // Split into lines, but exclude the last line if it's incomplete (no trailing newline)
  // This prevents partial headings from being parsed during streaming
  const allLines = reportText.split('\n');
  const hasTrailingNewline = reportText.endsWith('\n');
  // If there's a trailing newline, split creates an empty string at the end - remove it
  // If there's no trailing newline, keep all lines (the last line is complete enough to parse)
  const lines = hasTrailingNewline ? allLines.slice(0, -1) : allLines;

  // Initialize result structure
  const result: Map = {
    title: '',
    text: '',
    sections: []
  };

  // Stack to track the current path in the tree
  // Each entry is { node, level } where level is the heading level (1 = #, 2 = ##, etc.)
  const stack: { node: Map; level: number }[] = [{ node: result, level: 0 }];

  let contentBuffer: string[] = [];
  let hasSeenTitle = false;

  // Helper: Flush content buffer to the current node
  const flushContentBuffer = () => {
    const content = contentBuffer.join('\n').trim();
    if (content && stack.length > 0) {
      stack[stack.length - 1].node.text = content;
    }
    contentBuffer = [];
  };

  // Parse line by line
  for (const line of lines) {
    const level = getHeadingLevel(line);

    if (level > 0) {
      // It's a heading - flush content buffer first
      flushContentBuffer();

      const headingText = extractHeadingText(line);

      if (level === 1) {
        // Title (# heading) - set on root
        result.title = headingText;
        hasSeenTitle = true;
        // Reset stack to just root
        stack.length = 1;
      } else {
        // Find the appropriate parent level
        // Pop stack until we find a node with level < current level
        while (stack.length > 1 && stack[stack.length - 1].level >= level) {
          stack.pop();
        }

        // If no valid parent (orphan heading), promote to root level
        if (stack.length === 0) {
          stack.push({ node: result, level: 0 });
        }

        // Create new node
        const newNode: Map = {
          title: headingText,
          text: '',
          sections: []
        };

        // Add to parent's sections
        stack[stack.length - 1].node.sections.push(newNode);

        // Push new node onto stack
        stack.push({ node: newNode, level });
      }
    } else {
      // It's content text
      if (isHorizontalRule(line)) {
        continue;
      }
      if (hasSeenTitle || !line.trim()) {
        contentBuffer.push(line);
      }
    }
  }

  // Final flush for any remaining content
  flushContentBuffer();

  return result;
}

/**
 * Formats a Map object into a markdown string with proper heading hierarchy
 * (Inverse operation of parseReportToMap - converts structured data back to markdown)
 */
export function formatMap(map: Map | null, level: number = 1): string {
  if (!map) return '';

  const parts: string[] = [];

  // Add title with appropriate heading level
  if (map.title && map.title.trim()) {
    const prefix = '#'.repeat(level);
    parts.push(`${prefix} ${map.title}`);
  }

  // Add text content if present
  if (map.text && map.text.trim()) {
    parts.push(map.text);
  }

  // Recursively format child sections
  if (map.sections && map.sections.length > 0) {
    for (const section of map.sections) {
      const sectionText = formatMap(section, level + 1);
      if (sectionText) {
        parts.push(sectionText);
      }
    }
  }

  return parts.filter(Boolean).join('\n\n');
}

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
