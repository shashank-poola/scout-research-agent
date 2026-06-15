import type { ChatMessage } from '../lib/types';

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

export const sendChat = (id: number, message: string) =>
  request<ChatMessage>(`/sessions/${id}/chat`, {
    method: 'POST',
    body: JSON.stringify({ message }),
  });

export const getChatHistory = (id: number) =>
  request<ChatMessage[]>(`/sessions/${id}/chat/history`);
