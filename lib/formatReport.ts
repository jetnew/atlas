import { Report } from '@/lib/schemas/report';

/**
 * Formats a Report object into a markdown string with proper heading hierarchy
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
