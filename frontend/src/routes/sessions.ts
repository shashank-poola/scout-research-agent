import type { Session, CreateSessionPayload } from '../lib/types';

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

export const createSession = (data: CreateSessionPayload) =>
  request<Session>('/sessions/', { method: 'POST', body: JSON.stringify(data) });

export const listSessions = () => request<Session[]>('/sessions/');

export const getSession = (id: number) => request<Session>(`/sessions/${id}`);

export const deleteSession = (id: number) =>
  request<{ message: string }>(`/sessions/${id}`, { method: 'DELETE' });
