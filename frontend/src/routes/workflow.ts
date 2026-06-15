import type { ProgressEvent } from '../lib/types';

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
