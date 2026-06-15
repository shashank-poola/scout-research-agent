export type SessionStatus = 'pending' | 'running' | 'done' | 'error';

export interface Session {
  id: number;
  company_name: string;
  website: string;
  research_objective: string;
  status: SessionStatus;
  report_path: string | null;
  report_content: string | null;
  quality_score: number | null;
  created_at: string;
  updated_at: string;
}

export interface Report {
  session_id: number;
  company_name: string;
  website: string;
  research_objective: string;
  analysis: string | null;
  quality_score: number | null;
  report_path: string | null;
  status: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ProgressEvent {
  node: string;
  status: string;
  quality_score?: number;
  done?: boolean;
  ping?: boolean;
  error?: string;
  message?: string;
}

export interface CreateSessionPayload {
  company_name: string;
  website: string;
  research_objective: string;
}
