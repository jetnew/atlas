export interface Question {
  question: string;
  options: string[];
}

export interface Project {
  id: string;
  user_id: string;
  prompt: string;
  created_at: string;
  questions: Question[] | null;
  answers: Record<string, string> | null;
  report: string | null;
  sources: Source[];
}

export interface Source {
  id: string;
  created_at: string;
  user_id: string;
  name: string;
  project_id: string;
  storage_path: string;
  summary: string | null;
}

export interface UploadedFileInfo {
  id: string;
  file: File;
  name: string;
  storage_path: string;
  status: 'uploading' | 'success' | 'error';
  error?: string;
}

export interface Chat {
  id: string;
  user_id: string;
  project_id: string;
  title: string;
  messages: unknown[];
  created_at: string;
}
