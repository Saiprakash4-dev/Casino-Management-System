import { REFRESH_URL } from '../utils/constants';

export type AuthUser = { id: string; email: string; roles: string[] };

export type RefreshResponse = { accessToken: string };

export const refreshAccessToken = async (): Promise<string | null> => {
  const response = await fetch(REFRESH_URL, {
    credentials: 'include',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!response.ok) return null;
  const payload = (await response.json()) as RefreshResponse;
  return payload.accessToken ?? null;
};
