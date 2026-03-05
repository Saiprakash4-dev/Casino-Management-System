import { PageShell } from '../../components/layout/PageShell';
import { useAuth } from '../../providers/AuthProvider';

export const ProfilePage = () => {
  const { user, logout } = useAuth();
  return (
    <PageShell>
      <div className="card">
        <h2>Profile</h2>
        <p>{user?.email}</p>
        <p>Roles: {user?.roles.join(', ')}</p>
        <button onClick={() => logout()}>Logout</button>
      </div>
    </PageShell>
  );
};
