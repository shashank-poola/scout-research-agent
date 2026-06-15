import { BASE, request } from '../lib/http';
import type { ProgressEvent } from '../lib/types';

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
