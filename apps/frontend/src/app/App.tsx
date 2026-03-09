import { AppRoutes } from './routes';
import { NavBar } from '../components/layout/NavBar';
import { useAuth } from './providers/AuthProvider';
import { useLocation } from 'react-router-dom';

export function App() {
  const { user } = useAuth();
  const location = useLocation();
  const isAuthScreen = location.pathname === '/' || location.pathname === '/login';

  return (
    <div className="layout">
      {user && !isAuthScreen ? <NavBar /> : null}
      <AppRoutes />
    </div>
  );
}
