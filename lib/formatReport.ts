import { Report } from '@/lib/schemas/report';

/**
 * Formats a Report object into a markdown string with proper heading hierarchy
 */
export function formatReport(displayReport: Report | null): string {
  if (!displayReport?.report) return '';

  const title = displayReport.report.title
    ? (displayReport.report.title.startsWith('#') ? displayReport.report.title : `# ${displayReport.report.title}`)
    : '';

  const sections = displayReport.report.sections?.map((item) => {
    if (!item?.section) return '';

    const section = item.section;
    const sectionHeading = section.heading
      ? (section.heading.startsWith('#') ? section.heading : `## ${section.heading}`)
      : '';
    const sectionText = [sectionHeading, section.text].filter(Boolean).join('\n\n');

    const contentText = section.content?.map((contentItem) => {
      if (!contentItem?.subsection) return '';

      const subsection = contentItem.subsection;
      const subsectionHeading = subsection.subheading
        ? (subsection.subheading.startsWith('#') ? subsection.subheading : `### ${subsection.subheading}`)
        : '';
      const subsectionText = [subsectionHeading, subsection.text].filter(Boolean).join('\n\n');

      const subsubsectionText = subsection.subsubsection?.map((subsubItem) => {
        if (!subsubItem) return '';
        const subsubHeading = subsubItem.subsubheading
          ? (subsubItem.subsubheading.startsWith('#') ? subsubItem.subsubheading : `#### ${subsubItem.subsubheading}`)
          : '';
        return [subsubHeading, subsubItem.text].filter(Boolean).join('\n\n');
      }).join('\n\n') || '';

      return [subsectionText, subsubsectionText].filter(Boolean).join('\n\n');
    }).join('\n\n') || '';

    return [sectionText, contentText].filter(Boolean).join('\n\n');
  }).join('\n\n') || '';

  return [title, sections].filter(Boolean).join('\n\n');
}
