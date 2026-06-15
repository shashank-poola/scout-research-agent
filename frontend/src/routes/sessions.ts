import { request } from '../lib/http';
import type { Session, CreateSessionPayload } from '../lib/types';

export const createSession = (data: CreateSessionPayload) =>
  request<Session>('/sessions/', { method: 'POST', body: JSON.stringify(data) });

export const listSessions = () => request<Session[]>('/sessions/');

export const getSession = (id: number) => request<Session>(`/sessions/${id}`);

export const deleteSession = (id: number) =>
  request<{ message: string }>(`/sessions/${id}`, { method: 'DELETE' });
