import { ApolloProvider } from '@apollo/client';
import { PropsWithChildren } from 'react';
import { apolloClient } from '../../graphql/client';

export function ApolloAppProvider({ children }: PropsWithChildren) {
  return <ApolloProvider client={apolloClient}>{children}</ApolloProvider>;
}
