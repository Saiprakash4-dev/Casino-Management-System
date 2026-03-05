import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApolloClient } from '@apollo/client';
import { LOGIN_MUTATION, LOGOUT_MUTATION } from '../../graphql/mutations';
import { ME_QUERY } from '../../graphql/queries';
import { AuthUser, refreshAccessToken } from '../../services/auth';
import { tokenStorage } from '../../services/storage';
import { configureApolloHandlers } from '../../graphql/client';

type AuthContextValue = {
  isAuthenticated: boolean;
  user: AuthUser | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshIfNeeded: () => Promise<string | null>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const client = useApolloClient();
  const navigate = useNavigate();
  const [user, setUser] = useState<AuthUser | null>(null);

  const logout = useCallback(async () => {
    await client.mutate({ mutation: LOGOUT_MUTATION }).catch(() => undefined);
    tokenStorage.clear();
    setUser(null);
    await client.clearStore();
    navigate('/login');
  }, [client, navigate]);

  useEffect(() => {
    configureApolloHandlers({ logout: () => void logout() });
  }, [logout]);

  const refreshIfNeeded = useCallback(async () => {
    const token = await refreshAccessToken();
    tokenStorage.set(token);
    return token;
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const { data } = await client.mutate({ mutation: LOGIN_MUTATION, variables: { email, password } });
      tokenStorage.set(data?.login?.accessToken ?? null);
      const me = await client.query({ query: ME_QUERY, fetchPolicy: 'network-only' });
      setUser(me.data.me);
      navigate('/lobby');
    },
    [client, navigate],
  );

  useEffect(() => {
    if (!tokenStorage.get()) return;
    client
      .query({ query: ME_QUERY })
      .then((result) => setUser(result.data.me))
      .catch(() => logout());
  }, [client, logout]);

  const value = useMemo(
    () => ({ isAuthenticated: Boolean(user), user, login, logout, refreshIfNeeded }),
    [login, logout, refreshIfNeeded, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
