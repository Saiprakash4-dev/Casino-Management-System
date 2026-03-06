import { Navigate, Route, Routes } from 'react-router-dom';
import { LoginPage } from '../pages/Login';
import { GameDetailPage } from '../pages/GameDetail';
import { WalletPage } from '../pages/Wallet';
import { ProfilePage } from '../pages/Profile';
import { ProtectedRoute } from '../components/common/ProtectedRoute';
import { useAuth } from './providers/AuthProvider';

export function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/" element={user ? <Navigate to="/roulette" replace /> : <LoginPage />} />
      <Route path="/login" element={<Navigate to="/" replace />} />

      <Route
        path="/roulette"
        element={
          <ProtectedRoute>
            <GameDetailPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/funds"
        element={
          <ProtectedRoute>
            <WalletPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        }
      />

      <Route path="/lobby" element={<Navigate to="/roulette" replace />} />
      <Route path="/game/:id" element={<Navigate to="/roulette" replace />} />
      <Route path="/wallet" element={<Navigate to="/funds" replace />} />
      <Route path="/admin" element={<Navigate to="/profile" replace />} />
      <Route path="*" element={<Navigate to={user ? '/roulette' : '/'} replace />} />
    </Routes>
  );
}
