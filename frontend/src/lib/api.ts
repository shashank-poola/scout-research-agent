import type {
  Session,
  Report,
  ChatMessage,
  CreateSessionPayload,
  ProgressEvent,
} from './types';

const BASE = 'http://localhost:8000/api';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    ...init,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

// Sessions
export const createSession = (data: CreateSessionPayload) =>
  request<Session>('/sessions/', { method: 'POST', body: JSON.stringify(data) });

export const listSessions = () => request<Session[]>('/sessions/');

export const getSession = (id: number) => request<Session>(`/sessions/${id}`);

export const deleteSession = (id: number) =>
  request<{ message: string }>(`/sessions/${id}`, { method: 'DELETE' });

// Workflow
export const runWorkflow = (id: number) =>
  request<{ message: string; session_id: number }>(`/sessions/${id}/run`, { method: 'POST' });

export function streamProgress(
  id: number,
  onEvent: (e: ProgressEvent) => void,
): () => void {
  const es = new EventSource(`${BASE}/sessions/${id}/stream`);
  es.onmessage = (e) => {
    const data: ProgressEvent = JSON.parse(e.data);
    onEvent(data);
    if (data.done) es.close();
  };
  es.onerror = () => es.close();
  return () => es.close();
}

// Report
export const getReport = (id: number) => request<Report>(`/sessions/${id}/report`);

export const getPdfUrl = (id: number) => `${BASE}/sessions/${id}/report/pdf`;

// Chat
export const sendChat = (id: number, message: string) =>
  request<ChatMessage>(`/sessions/${id}/chat`, {
    method: 'POST',
    body: JSON.stringify({ message }),
  });

export const getChatHistory = (id: number) =>
  request<ChatMessage[]>(`/sessions/${id}/chat/history`);
