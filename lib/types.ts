export interface Project {
  id: string;
  user_id: string;
  prompt: string;
  created_at: string;
}

export interface Source {
  id: string;
  created_at: string;
  user_id: string;
  name: string;
  project_id: string;
  storage_path: string;
}

export interface UploadedFileInfo {
  id: string;
  file: File;
  name: string;
  storage_path: string;
  status: 'uploading' | 'success' | 'error';
  error?: string;
}
