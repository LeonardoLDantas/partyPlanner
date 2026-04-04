import { AuthSession, AuthenticatedUser } from '../types';
import { apiBaseUrl } from '../config/api';

type RegisterInput = {
  name: string;
  email: string;
  password: string;
};

type LoginInput = {
  email: string;
  password: string;
};

async function requestJson<T>(path: string, init?: RequestInit) {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  if (!response.ok) {
    const rawBody = await response.text().catch(() => '');
    const errorBody = rawBody
      ? (() => {
          try {
            return JSON.parse(rawBody);
          } catch {
            return null;
          }
        })()
      : null;
    throw new Error(
      errorBody?.message ?? rawBody ?? 'Falha ao comunicar com a autenticacao.'
    );
  }

  return (await response.json()) as T;
}

export const authApi = {
  register(input: RegisterInput) {
    return requestJson<AuthSession>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  login(input: LoginInput) {
    return requestJson<AuthSession>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  loginWithGoogle(idToken: string) {
    return requestJson<AuthSession>('/api/auth/google', {
      method: 'POST',
      body: JSON.stringify({ idToken }),
    });
  },

  me(accessToken: string) {
    return requestJson<AuthenticatedUser>('/api/auth/me', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
  },
};
