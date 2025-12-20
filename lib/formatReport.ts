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

    const { heading, text, content } = item.section;

    const sectionHeading = heading && heading.trim()
      ? (heading.startsWith('#') ? heading : `## ${heading}`)
      : '';
    const sectionText = [sectionHeading, text].filter(Boolean).join('\n\n');

    const contentText = (content || []).map((contentItem) => {
      if (!contentItem?.subsection) return '';

      const { subheading, text: subsectionText, subsubsection } = contentItem.subsection;

      const subsectionHeading = subheading && subheading.trim()
        ? (subheading.startsWith('#') ? subheading : `### ${subheading}`)
        : '';
      const subsectionContent = [subsectionHeading, subsectionText].filter(Boolean).join('\n\n');

      const subsubsectionText = (subsubsection || []).map((subsubItem) => {
        if (!subsubItem) return '';

        const { subsubheading, text: subsubText } = subsubItem;
        const subsubHeading = subsubheading && subsubheading.trim()
          ? (subsubheading.startsWith('#') ? subsubheading : `#### ${subsubheading}`)
          : '';

        return [subsubHeading, subsubText].filter(Boolean).join('\n\n');
      }).join('\n\n');

      return [subsectionContent, subsubsectionText].filter(Boolean).join('\n\n');
    }).join('\n\n');

    return [sectionText, contentText].filter(Boolean).join('\n\n');
  }).join('\n\n');

  return [titleText, sectionsText].filter(Boolean).join('\n\n');
}
