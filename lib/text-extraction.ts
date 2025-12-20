import { PDFParse } from 'pdf-parse';
import mammoth from 'mammoth';

/**
 * Supported file extensions for text extraction
 */
const SUPPORTED_EXTENSIONS = ['.pdf', '.docx', '.txt', '.md'] as const;

type SupportedExtension = typeof SUPPORTED_EXTENSIONS[number];

/**
 * MIME type mappings for validation
 */
const SUPPORTED_MIME_TYPES: Record<string, string[]> = {
  pdf: ['application/pdf'],
  docx: [
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ],
  txt: ['text/plain'],
  md: ['text/markdown', 'text/plain'],
};

/**
 * Extract file extension from filename
 */
function getFileExtension(filename: string): string {
  const match = filename.toLowerCase().match(/\.[^.]+$/);
  return match ? match[0] : '';
}

/**
 * Validate file type based on extension and MIME type
 */
function isValidFileType(file: File, extension: string): boolean {
  const extWithoutDot = extension.substring(1);
  const expectedMimeTypes = SUPPORTED_MIME_TYPES[extWithoutDot];

  if (!expectedMimeTypes) {
    return false;
  }

  // Check if MIME type matches expected types
  // If MIME type is generic or missing, rely on extension
  if (file.type && !expectedMimeTypes.includes(file.type)) {
    console.warn(
      `File "${file.name}" has extension ${extension} but MIME type "${file.type}". Proceeding based on extension.`
    );
  }

  return true;
}

/**
 * Extract text from PDF file using pdf-parse
 */
async function extractTextFromPDF(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const parser = new PDFParse({ data: buffer });
    const result = await parser.getText();
    await parser.destroy();
    return result.text || "";
  } catch (error) {
    throw new Error(
      `Failed to extract text from PDF "${file.name}": ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

/**
 * Extract text from DOCX file using mammoth
 */
async function extractTextFromDOCX(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const result = await mammoth.extractRawText({ buffer });
    return result.value || "";
  } catch (error) {
    throw new Error(
      `Failed to extract text from DOCX "${file.name}": ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

/**
 * Extract text from plain text files (TXT, MD) using TextDecoder
 */
async function extractTextFromPlainText(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const decoder = new TextDecoder('utf-8');
    return decoder.decode(arrayBuffer);
  } catch (error) {
    throw new Error(
      `Failed to extract text from "${file.name}": ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

/**
 * Main function to extract text from a file
 * Supports: PDF, DOCX, TXT, MD
 *
 * @param file - The file to extract text from
 * @returns Extracted text as a string, or empty string if unsupported/failed
 */
export async function extractText(file: File): Promise<string> {
  const extension = getFileExtension(file.name);

  // Return empty string for unsupported extensions
  if (!SUPPORTED_EXTENSIONS.includes(extension as SupportedExtension)) {
    return '';
  }

  // Validate file type
  if (!isValidFileType(file, extension)) {
    return '';
  }

  // Route to appropriate extraction function
  try {
    switch (extension) {
      case '.pdf':
        return await extractTextFromPDF(file);
      case '.docx':
        return await extractTextFromDOCX(file);
      case '.txt':
      case '.md':
        return await extractTextFromPlainText(file);
      default:
        return '';
    }
  } catch (error) {
    console.warn(`Failed to extract text from "${file.name}":`, error);
    return '';
  }
}
