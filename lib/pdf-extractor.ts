import { PDFParse } from 'pdf-parse';

/**
 * Represents text content from a single PDF page
 */
export interface PageText {
  pageNumber: number;
  text: string;
}

/**
 * Extract text from PDF buffer page by page using pdf-parse.
 *
 * This function processes the PDF and returns text content for each page separately,
 * which allows for page-aware chunking without mixing content from different pages.
 *
 * Uses pdf-parse which is more reliable in Node.js environments compared to pdfjs-dist workers.
 *
 * @param buffer - PDF file buffer
 * @returns Array of page text objects with page number and content
 */
export async function extractPdfTextByPages(buffer: Buffer): Promise<PageText[]> {
  try {
    // Create parser and extract text
    const parser = new PDFParse({ data: buffer });
    const result = await parser.getText();

    // Clean up
    await parser.destroy();

    // Convert PageTextResult[] to PageText[]
    const pages: PageText[] = result.pages.map(page => ({
      pageNumber: page.num,
      text: page.text
    }));

    return pages;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    throw new Error('Failed to extract text from PDF: ' + message);
  }
}
