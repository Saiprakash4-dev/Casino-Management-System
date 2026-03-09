import { PropsWithChildren, createContext, useContext, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { LOGIN_MUTATION, LOGOUT_MUTATION } from '../../graphql/mutations';
import { ME_QUERY } from '../../graphql/queries';

export type AuthUser = { id: string; email: string; roles: string[] };

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const hasToken = Boolean(localStorage.getItem('token'));
  const { loading: meLoading } = useQuery(ME_QUERY, {
    skip: !hasToken,
    onCompleted: (data) => setUser(data.me),
    onError: () => setUser(null),
  });

  const [loginMutation] = useMutation(LOGIN_MUTATION, {
    onCompleted: (data) => {
      const { accessToken, user: loginUser } = data.login;
      localStorage.setItem('token', accessToken);
      setUser(loginUser);
    },
  });

  const [logoutMutation] = useMutation(LOGOUT_MUTATION, {
    onCompleted: () => {
      localStorage.removeItem('token');
      localStorage.removeItem('roulette:lastKnownWallet');
      setUser(null);
    },
  });

  const login = async (email: string, password: string) => {
    await loginMutation({ variables: { email, password } });
  };

  const logout = async () => {
    await logoutMutation();
  };

  const value = useMemo(
    () => ({ user, loading: meLoading, login, logout }),
    [user, meLoading, login, logout],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
