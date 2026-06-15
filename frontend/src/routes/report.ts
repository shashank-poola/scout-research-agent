import { BASE, request } from '../lib/http';
import type { Report } from '../lib/types';

export const getReport = (id: number) => request<Report>(`/sessions/${id}/report`);

export const getPdfUrl = (id: number) => `${BASE}/sessions/${id}/report/pdf`;
export const getDownloadUrl = (id: number) => `${BASE}/sessions/${id}/report/pdf?download=true`;
