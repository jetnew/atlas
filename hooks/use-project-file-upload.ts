import { useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  uploadFileToStorage,
  deleteFileFromStorage,
  generateStoragePath
} from '@/lib/supabase/storage';
import type { UploadedFileInfo } from '@/lib/types';

interface UseProjectFileUploadProps {
  projectId: string;
}

interface UseProjectFileUploadReturn {
  uploadedFiles: UploadedFileInfo[];
  uploadFile: (file: File) => Promise<boolean>;
  deleteFile: (fileId: string) => Promise<boolean>;
  isUploading: boolean;
}

/**
 * Custom hook for handling file uploads in a project
 * Follows the pattern of useCurrentUserName and useCurrentUserImage
 */
export function useProjectFileUpload({
  projectId
}: UseProjectFileUploadProps): UseProjectFileUploadReturn {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFileInfo[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  /**
   * Upload a file to storage and create a source record
   */
  const uploadFile = useCallback(async (file: File): Promise<boolean> => {
    const supabase = createClient();

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error('User not authenticated:', userError);
      return false;
    }

    const userId = user.id;
    const storagePath = generateStoragePath(userId, projectId, file.name);

    // Add file to state with 'uploading' status
    const tempId = crypto.randomUUID();
    const uploadingFile: UploadedFileInfo = {
      id: tempId,
      file,
      name: file.name,
      storage_path: storagePath,
      status: 'uploading',
    };

    setUploadedFiles(prev => [...prev, uploadingFile]);
    setIsUploading(true);

    try {
      // Step 1: Upload to storage
      const uploadResult = await uploadFileToStorage(file, storagePath);
      if (!uploadResult.success) {
        // Update status to error
        setUploadedFiles(prev =>
          prev.map(f =>
            f.id === tempId
              ? { ...f, status: 'error' as const, error: uploadResult.error }
              : f
          )
        );
        return false;
      }

      // Step 2: Create source record in database
      const { data: sourceData, error: dbError } = await supabase
        .from('sources')
        .insert({
          user_id: userId,
          name: file.name,
          project_id: projectId,
          storage_path: storagePath,
        })
        .select()
        .single();

      if (dbError || !sourceData) {
        console.error('Database insert error:', dbError);

        // Rollback: Delete from storage
        await deleteFileFromStorage(storagePath);

        // Update status to error
        setUploadedFiles(prev =>
          prev.map(f =>
            f.id === tempId
              ? { ...f, status: 'error' as const, error: 'Failed to save to database' }
              : f
          )
        );
        return false;
      }

      // Step 3: Update state with success and real ID
      setUploadedFiles(prev =>
        prev.map(f =>
          f.id === tempId
            ? { ...f, id: sourceData.id, status: 'success' as const }
            : f
        )
      );

      return true;
    } catch (error) {
      console.error('Unexpected upload error:', error);

      // Update status to error
      setUploadedFiles(prev =>
        prev.map(f =>
          f.id === tempId
            ? {
                ...f,
                status: 'error' as const,
                error: error instanceof Error ? error.message : 'Unknown error'
              }
            : f
        )
      );

      // Try to clean up storage if it was uploaded
      await deleteFileFromStorage(storagePath);

      return false;
    } finally {
      setIsUploading(false);
    }
  }, [projectId]);

  /**
   * Delete a file from storage and remove source record
   */
  const deleteFile = useCallback(async (fileId: string): Promise<boolean> => {
    const supabase = createClient();

    // Find the file in state
    const fileToDelete = uploadedFiles.find(f => f.id === fileId);
    if (!fileToDelete) {
      console.error('File not found:', fileId);
      return false;
    }

    try {
      // Step 1: Delete from database (this is the source of truth)
      const { error: dbError } = await supabase
        .from('sources')
        .delete()
        .eq('id', fileId);

      if (dbError) {
        console.error('Database delete error:', dbError);
        return false;
      }

      // Step 2: Delete from storage
      // Note: We continue even if this fails, as the database record is already deleted
      const storageResult = await deleteFileFromStorage(fileToDelete.storage_path);
      if (!storageResult.success) {
        console.warn('Storage delete failed (orphaned file):', storageResult.error);
        // The cleanup function in SQL can handle this later
      }

      // Step 3: Update state
      setUploadedFiles(prev => prev.filter(f => f.id !== fileId));

      return true;
    } catch (error) {
      console.error('Unexpected delete error:', error);
      return false;
    }
  }, [uploadedFiles]);

  return {
    uploadedFiles,
    uploadFile,
    deleteFile,
    isUploading,
  };
}
