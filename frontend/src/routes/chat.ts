import { request } from '../lib/http';
import type { ChatMessage } from '../lib/types';

export const sendChat = (id: number, message: string) =>
  request<ChatMessage>(`/sessions/${id}/chat`, {
    method: 'POST',
    body: JSON.stringify({ message }),
  });

export const getChatHistory = (id: number) =>
  request<ChatMessage[]>(`/sessions/${id}/chat/history`);
