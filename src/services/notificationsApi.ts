import { AppNotification } from '../types';
import { apiBaseUrl } from '../config/api';
import { getAccessToken } from './sessionStorage';

async function requestJson<T>(path: string, init?: RequestInit) {
  const accessToken = getAccessToken();
  const response = await fetch(`${apiBaseUrl}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || 'Falha ao comunicar com a API de notificacoes.');
  }

  if (response.status === 204) {
    return null as T;
  }

  return (await response.json()) as T;
}

export const notificationsApi = {
  getAll() {
    return requestJson<AppNotification[]>('/api/notifications');
  },

  markAsRead(notificationId: string) {
    return requestJson<AppNotification>(`/api/notifications/${notificationId}/read`, {
      method: 'PATCH',
    });
  },

  markAllAsRead() {
    return requestJson<{ updated: number }>('/api/notifications/read-all', {
      method: 'PATCH',
    });
  },
};
