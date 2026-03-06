import { AppRoutes } from './routes';
import { NavBar } from '../components/layout/NavBar';

export function App() {
  return (
    <div className="layout">
      <NavBar />
      <AppRoutes />
    </div>
  );
}
