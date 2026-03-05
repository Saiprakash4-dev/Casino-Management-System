import { Link } from 'react-router-dom';
import { useAuth } from '../../providers/AuthProvider';
import { useQuery } from '@apollo/client';
import { WALLET_BALANCE_QUERY } from '../../../graphql/queries';
import { formatCurrency } from '../../../utils/format';

export const NavBar = () => {
  const { user } = useAuth();
  const { data } = useQuery(WALLET_BALANCE_QUERY, { skip: !user });
  return (
    <nav className="nav">
      <ul>
        <li><Link to="/lobby">Lobby</Link></li>
        <li><Link to="/wallet">Wallet</Link></li>
        <li><Link to="/profile">Profile</Link></li>
        {user?.roles.includes('ADMIN') && <li><Link to="/admin">Admin</Link></li>}
        <li className="spacer">Balance: {formatCurrency(data?.walletBalance?.amount ?? 0)}</li>
      </ul>
    </nav>
  );
};
