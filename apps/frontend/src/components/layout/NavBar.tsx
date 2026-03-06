import { NavLink } from 'react-router-dom';

const links = [
  ['/', 'Lobby'],
  ['/wallet', 'Wallet'],
  ['/profile', 'Profile'],
  ['/admin', 'Admin'],
  ['/login', 'Login']
];

export function NavBar() {
  return (
    <nav className="nav">
      {links.map(([to, label]) => (
        <NavLink key={to} to={to} className={({ isActive }) => (isActive ? 'active' : '')}>
          {label}
        </NavLink>
      ))}
    </nav>
  );
}
