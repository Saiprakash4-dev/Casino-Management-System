import { AppRoutes } from './routes';
import { AppApolloProvider } from './providers/ApolloProvider';
import { AuthProvider } from './providers/AuthProvider';
import { RealtimeProvider } from './providers/RealtimeProvider';
import { ToastCenter } from './components/common/ToastCenter';

export const App = () => (
  <AppApolloProvider>
    <AuthProvider>
      <RealtimeProvider>
        <ToastCenter />
        <AppRoutes />
      </RealtimeProvider>
    </AuthProvider>
  </AppApolloProvider>
);
