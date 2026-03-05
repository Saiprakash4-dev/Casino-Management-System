import { Navigate } from 'react-router-dom';
import { useAuth } from '../../providers/AuthProvider';

export const ProtectedRoute = ({ children, requiredRole }: { children: JSX.Element; requiredRole?: string }) => {
  const { isAuthenticated, user } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (requiredRole && !user?.roles.includes(requiredRole)) return <Navigate to="/lobby" replace />;
  return children;
};
