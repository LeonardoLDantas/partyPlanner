import { Party } from '../types';
import { apiBaseUrl } from '../config/api';
import { getAccessToken } from './sessionStorage';

type CreatePartyInput = {
  name: string;
  category: string;
  date: string;
  location: string;
  estimatedBudget: number;
};

type CreateTaskInput = {
  title: string;
  assignee: string;
};

type CreateGuestInput = {
  name: string;
  group: string;
  status: string;
};

type CreateBudgetItemInput = {
  label: string;
  category: string;
  amount: number;
};

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
    throw new Error(errorText || 'Falha ao comunicar com a API.');
  }

  return (await response.json()) as T;
}

export const partyApi = {
  getParties() {
    return requestJson<Party[]>('/api/parties');
  },

  createParty(input: CreatePartyInput) {
    return requestJson<Party>('/api/parties', {
      method: 'POST',
      body: JSON.stringify({
        name: input.name,
        category: input.category,
        date: input.date,
        location: input.location,
        estimatedBudget: input.estimatedBudget,
      }),
    });
  },

  createTask(partyId: string, input: CreateTaskInput) {
    return requestJson<Party>(`/api/parties/${partyId}/tasks`, {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  createGuest(partyId: string, input: CreateGuestInput) {
    return requestJson<Party>(`/api/parties/${partyId}/guests`, {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  createBudgetItem(partyId: string, input: CreateBudgetItemInput) {
    return requestJson<Party>(`/api/parties/${partyId}/budget-items`, {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  toggleTask(partyId: string, taskId: string) {
    return requestJson<Party>(`/api/parties/${partyId}/tasks/${taskId}/toggle`, {
      method: 'PATCH',
    });
  },
};
