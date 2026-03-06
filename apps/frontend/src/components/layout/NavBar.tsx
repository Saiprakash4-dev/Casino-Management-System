import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../app/providers/AuthProvider';

const links = [
  ['/roulette', 'Russian Roulette'],
  ['/funds', 'Funds'],
  ['/profile', 'Profile'],
];

export function NavBar() {
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/', { replace: true });
  };

  return (
    <header className="nav-shell">
      <nav className="nav">
        <div className="nav-brand">
          <p className="nav-eyebrow">Casino Control</p>
          <h1 className="nav-title">Russian Roulette Floor</h1>
        </div>
        <div className="nav-links">
          {links.map(([to, label]) => (
            <NavLink key={to} to={to} className={({ isActive }) => (isActive ? 'active' : '')}>
              {label}
            </NavLink>
          ))}
        </div>
        <div className="nav-actions">
          <p className="nav-user">{user?.email}</p>
          <button className="btn btn-secondary" onClick={handleLogout} type="button">
            Logout
          </button>
        </div>
      </nav>
    </header>
  );
}
