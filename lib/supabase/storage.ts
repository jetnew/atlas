import { createClient } from '@/lib/supabase/client';
import { v4 as uuidv4 } from 'uuid';

export const STORAGE_BUCKET = 'project-sources';

/**
 * Generate a unique storage path for a file
 * Format: {user_id}/{project_id}/{uuid}_{filename}
 */
export function generateStoragePath(
  userId: string,
  projectId: string,
  fileName: string
): string {
  // Sanitize filename to prevent issues
  const sanitizedFileName = fileName
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .substring(0, 200); // Limit filename length

  const uniqueId = uuidv4();
  return `${userId}/${projectId}/${uniqueId}_${sanitizedFileName}`;
}

/**
 * Upload a file to Supabase Storage
 * @returns The storage path on success, null on failure
 */
export async function uploadFileToStorage(
  file: File,
  storagePath: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();

  try {
    const { error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(storagePath, file, {
        cacheControl: '3600',
        upsert: false, // Don't overwrite existing files
      });

    if (error) {
      console.error('Storage upload error:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Unexpected upload error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Delete a file from Supabase Storage
 */
export async function deleteFileFromStorage(
  storagePath: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();

  try {
    const { error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .remove([storagePath]);

    if (error) {
      console.error('Storage delete error:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Unexpected delete error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Get a signed URL for a file (for future use)
 * Note: Currently bucket is private, so this returns a signed URL
 */
export async function getFileUrl(storagePath: string, expiresIn = 3600): Promise<string | null> {
  const supabase = createClient();

  const { data } = await supabase.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(storagePath, expiresIn);

  return data?.signedUrl || null;
}
