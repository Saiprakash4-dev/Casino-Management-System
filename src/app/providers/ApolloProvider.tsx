import { ApolloProvider } from '@apollo/client';
import { useState } from 'react';
import { apolloClient, configureApolloHandlers } from '../../graphql/client';

export const AppApolloProvider = ({ children }: { children: React.ReactNode }) => {
  const [correlationId, setCorrelationId] = useState<string | undefined>();
  configureApolloHandlers({ setCorrelationId });

  return (
    <>
      {correlationId && <div className="banner container">Support reference: {correlationId}</div>}
      <ApolloProvider client={apolloClient}>{children}</ApolloProvider>
    </>
  );
};
