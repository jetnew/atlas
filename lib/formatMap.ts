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
  const lines = hasTrailingNewline ? allLines.slice(0, -1) : allLines.slice(0, -1);

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
