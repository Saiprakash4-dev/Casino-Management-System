import { Navigate, Route, Routes } from 'react-router-dom';
import { LoginPage } from '../pages/Login';
import { LobbyPage } from '../pages/Lobby';
import { GameDetailPage } from '../pages/GameDetail';
import { WalletPage } from '../pages/Wallet';
import { ProfilePage } from '../pages/Profile';
import { AdminPage } from '../pages/Admin';

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LobbyPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/game/:id" element={<GameDetailPage />} />
      <Route path="/wallet" element={<WalletPage />} />
      <Route path="/profile" element={<ProfilePage />} />
      <Route path="/admin" element={<AdminPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
