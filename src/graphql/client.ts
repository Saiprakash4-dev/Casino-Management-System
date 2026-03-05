import { ApolloClient, ApolloLink, HttpLink, InMemoryCache, from, Observable } from '@apollo/client';
import { onError } from '@apollo/client/link/error';
import { refreshAccessToken } from '../services/auth';
import { tokenStorage } from '../services/storage';
import { API_URL } from '../utils/constants';

type Handlers = { logout: () => void; setCorrelationId: (id?: string) => void };

const handlers: Handlers = {
  logout: () => undefined,
  setCorrelationId: () => undefined,
};

export const configureApolloHandlers = (next: Partial<Handlers>) => Object.assign(handlers, next);

const httpLink = new HttpLink({ uri: API_URL, credentials: 'include' });

const authLink = new ApolloLink((operation, forward) => {
  const token = tokenStorage.get();
  operation.setContext(({ headers = {} }) => ({
    headers: { ...headers, ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  }));
  return forward(operation);
});

const errorLink = onError(({ networkError, operation, forward, response }) => {
  const statusCode = (networkError as { statusCode?: number } | undefined)?.statusCode;
  handlers.setCorrelationId(response?.http?.headers.get('x-correlation-id') ?? undefined);

  if (statusCode === 401) {
    return new Observable((observer) => {
      refreshAccessToken()
        .then((token) => {
          if (!token) {
            handlers.logout();
            observer.error(networkError);
            return;
          }
          tokenStorage.set(token);
          operation.setContext(({ headers = {} }) => ({
            headers: { ...headers, Authorization: `Bearer ${token}` },
          }));
          forward(operation).subscribe(observer);
        })
        .catch((err) => {
          handlers.logout();
          observer.error(err);
        });
    });
  }

  if (statusCode === 403) handlers.logout();
  return undefined;
});

export const apolloClient = new ApolloClient({
  link: from([errorLink, authLink, httpLink]),
  cache: new InMemoryCache({
    typePolicies: {
      Wallet: { keyFields: ['id'] },
      Game: { keyFields: ['id'] },
      Bet: { keyFields: ['id'] },
      Transaction: { keyFields: ['id'] },
    },
  }),
});
