import { Map, MapDiff, AddDiff, DeleteDiff, UpdateDiff } from '@/lib/schemas/map';

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
 * Apply a single diff to the map
 * Detects diff type by checking which key exists (add/delete/update)
 */
export function applyDiff(map: Map, diff: MapDiff): Map {
  if ('add' in diff) {
    return applyAddDiff(map, diff as AddDiff);
  } else if ('delete' in diff) {
    return applyDeleteDiff(map, diff as DeleteDiff);
  } else if ('update' in diff) {
    return applyUpdateDiff(map, diff as UpdateDiff);
  }
  return map;
}

/**
 * Apply an array of diffs to the map in order
 */
export function applyDiffs(map: Map, diffs: MapDiff[]): Map {
  return diffs.reduce((currentMap, diff) => applyDiff(currentMap, diff), cloneMap(map));
}

/**
 * Ensure a node has all required fields with defaults
 */
function normalizeNode(node: Map): Map {
  return {
    title: node.title || '',
    text: node.text || '',
    sections: node.sections || [],
  };
}

/**
 * Apply an add diff - insert a new node at the specified position
 */
function applyAddDiff(map: Map, diff: AddDiff): Map {
  const newMap = cloneMap(map);
  const parentId = getParentId(diff.add);
  const insertIndex = getNodeIndex(diff.add);
  const normalizedNode = normalizeNode(diff.node);

  // Handle adding to root's sections
  if (parentId === null || parentId === 'root') {
    if (!newMap.sections) {
      newMap.sections = [];
    }
    // Insert at the specified index, or append if index is beyond current length
    const safeIndex = Math.min(insertIndex, newMap.sections.length);
    newMap.sections.splice(safeIndex, 0, normalizedNode);
    return newMap;
  }

  const parent = getNodeByPath(newMap, parentId);
  if (!parent) {
    // Parent doesn't exist, skip this diff
    return newMap;
  }

  if (!parent.sections) {
    parent.sections = [];
  }

  // Insert at the specified index, or append if index is beyond current length
  const safeIndex = Math.min(insertIndex, parent.sections.length);
  parent.sections.splice(safeIndex, 0, normalizedNode);

  return newMap;
}

/**
 * Apply a delete diff - remove a node (cascades to children automatically)
 */
function applyDeleteDiff(map: Map, diff: DeleteDiff): Map {
  const newMap = cloneMap(map);

  // Handle deleting root - clear sections but keep root structure
  if (diff.delete === 'root') {
    newMap.sections = [];
    return newMap;
  }

  const parentId = getParentId(diff.delete);
  const index = getNodeIndex(diff.delete);

  if (parentId === null) {
    return newMap;
  }

  // Handle deleting from root's sections
  if (parentId === 'root') {
    if (newMap.sections && index >= 0 && index < newMap.sections.length) {
      newMap.sections.splice(index, 1);
    }
    return newMap;
  }

  const parent = getNodeByPath(newMap, parentId);
  if (!parent || !parent.sections) {
    return newMap;
  }

  if (index >= 0 && index < parent.sections.length) {
    parent.sections.splice(index, 1);
  }

  return newMap;
}

/**
 * Apply an update diff - replace a node entirely
 */
function applyUpdateDiff(map: Map, diff: UpdateDiff): Map {
  const normalizedNode = normalizeNode(diff.node);
  return replaceNodeInMap(map, diff.update, normalizedNode);
}
