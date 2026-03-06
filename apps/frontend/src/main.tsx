import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './app/App';
import { ApolloAppProvider } from './app/providers/ApolloProvider';
import { AuthProvider } from './app/providers/AuthProvider';
import { RealtimeProvider } from './app/providers/RealtimeProvider';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <ApolloAppProvider>
        <AuthProvider>
          <RealtimeProvider>
            <App />
          </RealtimeProvider>
        </AuthProvider>
      </ApolloAppProvider>
    </BrowserRouter>
  </React.StrictMode>
);
