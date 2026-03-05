import { Navigate, Route, Routes } from 'react-router-dom';
import { LoginPage } from './pages/Login';
import { LobbyPage } from './pages/Lobby';
import { GameDetailPage } from './pages/GameDetail';
import { WalletPage } from './pages/Wallet';
import { ProfilePage } from './pages/Profile';
import { AdminPage } from './pages/Admin';
import { ProtectedRoute } from './components/common/ProtectedRoute';

export const AppRoutes = () => (
  <Routes>
    <Route path="/login" element={<LoginPage />} />
    <Route path="/lobby" element={<ProtectedRoute><LobbyPage /></ProtectedRoute>} />
    <Route path="/game/:gameId" element={<ProtectedRoute><GameDetailPage /></ProtectedRoute>} />
    <Route path="/wallet" element={<ProtectedRoute><WalletPage /></ProtectedRoute>} />
    <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
    <Route path="/admin" element={<ProtectedRoute requiredRole="ADMIN"><AdminPage /></ProtectedRoute>} />
    <Route path="*" element={<Navigate to="/lobby" replace />} />
  </Routes>
);
