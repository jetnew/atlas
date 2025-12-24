import { Report, Map as MapType } from '@/lib/schemas/report';

/**
 * Extracts the title (first # heading) from a markdown report string.
 * Returns null if no title is found.
 */
export function parseReportToTitle(reportText: string | null | undefined): string | null {
  if (!reportText) return null;

  const lines = reportText.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    const match = trimmed.match(/^#\s+(.+)$/);
    if (match) {
      return match[1].trim();
    }
  }
  return null;
}

/**
 * Parses a markdown report string into structured map data.
 * Supports strict hierarchy with promotion for orphaned headings.
 */
export function parseReportToMap(reportText: string): MapType {
  // Helper: Get heading level (0 if not a heading, 1-4 for #-####)
  const getHeadingLevel = (line: string): number => {
    const trimmed = line.trim();
    const match = trimmed.match(/^(#{1,4})\s/);
    return match ? match[1].length : 0;
  };

  // Helper: Extract heading text (remove # and trim)
  const extractHeadingText = (line: string): string => {
    return line.trim().replace(/^#{1,4}\s+/, '');
  };

  // Helper: Check if line is a horizontal rule (---, ***, ___)
  const isHorizontalRule = (line: string): boolean => {
    const trimmed = line.trim();
    // Match --- or *** or ___ (3 or more, with optional spaces between)
    return /^[-*_]{3,}$/.test(trimmed) || /^([-*_]\s*){3,}$/.test(trimmed);
  };

  // Helper: Flush content buffer to appropriate location
  const flushContentBuffer = () => {
    const content = contentBuffer.join('\n').trim();
    if (!content) {
      contentBuffer = [];
      return;
    }

    if (currentSubsubsection) {
      currentSubsubsection.text = content;
    } else if (currentSubsection) {
      currentSubsection.subsection.text = content;
    } else if (currentSection) {
      currentSection.section.text = content;
    } else if (hasSeenTitle) {
      result.report.text = content;
    }
    // else: discard pre-title content

    contentBuffer = [];
  };

  const lines = reportText.split('\n');

  // Initialize result structure
  const result: MapType = {
    report: {
      title: '',
      text: '',
      sections: []
    }
  };

  // State tracking
  let hasSeenTitle = false;
  let currentSection: MapType['report']['sections'][number] | null = null;
  let currentSubsection: MapType['report']['sections'][number]['section']['content'][number] | null = null;
  let currentSubsubsection: MapType['report']['sections'][number]['section']['content'][number]['subsection']['subsubsection'][number] | null = null;
  let contentBuffer: string[] = [];

  // Parse line by line
  for (const line of lines) {
    const level = getHeadingLevel(line);

    if (level > 0) {
      // It's a heading - flush content buffer first
      flushContentBuffer();

      const headingText = extractHeadingText(line);

      if (level === 1) {
        // Title (# heading)
        result.report.title = headingText;
        hasSeenTitle = true;
        currentSection = null;
        currentSubsection = null;
        currentSubsubsection = null;
      } else if (level === 2) {
        // Section (## heading)
        currentSection = {
          section: {
            heading: headingText,
            text: '',
            content: []
          }
        };
        result.report.sections.push(currentSection);
        currentSubsection = null;
        currentSubsubsection = null;
      } else if (level === 3) {
        // Subsection (### heading)
        if (!currentSection) {
          // PROMOTE: No parent section, create as section
          currentSection = {
            section: {
              heading: headingText,
              text: '',
              content: []
            }
          };
          result.report.sections.push(currentSection);
          currentSubsection = null;
          currentSubsubsection = null;
        } else {
          // Normal case: create subsection within current section
          currentSubsection = {
            subsection: {
              subheading: headingText,
              text: '',
              subsubsection: []
            }
          };
          currentSection.section.content.push(currentSubsection);
          currentSubsubsection = null;
        }
      } else if (level === 4) {
        // Subsubsection (#### heading)
        if (!currentSubsection) {
          // PROMOTE: No parent subsection
          if (!currentSection) {
            // PROMOTE AGAIN: No parent section either, create as section
            currentSection = {
              section: {
                heading: headingText,
                text: '',
                content: []
              }
            };
            result.report.sections.push(currentSection);
            currentSubsection = null;
            currentSubsubsection = null;
          } else {
            // PROMOTE to subsection level
            currentSubsection = {
              subsection: {
                subheading: headingText,
                text: '',
                subsubsection: []
              }
            };
            currentSection.section.content.push(currentSubsection);
            currentSubsubsection = null;
          }
        } else {
          // Normal case: create subsubsection within current subsection
          currentSubsubsection = {
            subsubheading: headingText,
            text: ''
          };
          currentSubsection.subsection.subsubsection.push(currentSubsubsection);
        }
      }
    } else {
      // It's content text
      if (isHorizontalRule(line)) {
        // Skip horizontal rules (---, ***, ___)
        continue;
      }
      if (hasSeenTitle || !line.trim()) {
        // Add to buffer if we've seen title, or if it's an empty line (preserve spacing)
        contentBuffer.push(line);
      }
      // else: discard pre-title content
    }
  }

  // Final flush for any remaining content
  flushContentBuffer();

  return result;
}

/**
 * Formats a Report object into a markdown string with proper heading hierarchy
 * (Inverse operation of parseReportToMap - converts structured data back to markdown)
 */
export function formatReport(displayReport: Report | null): string {
  if (!displayReport?.report) return '';

  const { title, sections } = displayReport.report;

  const titleText = title && title.trim()
    ? (title.startsWith('#') ? title : `# ${title}`)
    : '';

  const sectionsText = (sections || []).map((item) => {
    if (!item?.section) return '';

    const { heading, content } = item.section;

    const sectionHeading = heading && heading.trim()
      ? (heading.startsWith('#') ? heading : `## ${heading}`)
      : '';

    const contentText = (content || []).map((contentItem) => {
      if (!contentItem?.subsection) return '';

      const { subheading, subsubsection } = contentItem.subsection;

      const subsectionHeading = subheading && subheading.trim()
        ? (subheading.startsWith('#') ? subheading : `### ${subheading}`)
        : '';

      const subsubsectionText = (subsubsection || []).map((subsubItem) => {
        if (!subsubItem) return '';

        const { subsubheading } = subsubItem;
        const subsubHeading = subsubheading && subsubheading.trim()
          ? (subsubheading.startsWith('#') ? subsubheading : `#### ${subsubheading}`)
          : '';

        return subsubHeading;
      }).filter(Boolean).join('\n\n');

      return [subsectionHeading, subsubsectionText].filter(Boolean).join('\n\n');
    }).join('\n\n');

    return [sectionHeading, contentText].filter(Boolean).join('\n\n');
  }).join('\n\n');

  return [titleText, sectionsText].filter(Boolean).join('\n\n');
}
