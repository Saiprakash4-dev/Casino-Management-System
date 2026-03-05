import { FormEvent, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../providers/AuthProvider';
import { isEmail } from '../../../utils/validators';

export const LoginPage = () => {
  const { isAuthenticated, login } = useAuth();
  const [email, setEmail] = useState('admin@casino.dev');
  const [password, setPassword] = useState('password');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (isAuthenticated) return <Navigate to="/lobby" replace />;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!isEmail(email)) return setError('Invalid email');
    if (!password) return setError('Password is required');
    setLoading(true);
    setError(null);
    try { await login(email, password); } catch { setError('Login failed. Check credentials.'); } finally { setLoading(false); }
  };

  return (
    <main className="container" style={{ maxWidth: 420 }}>
      <form className="card" onSubmit={handleSubmit}>
        <h2>Login</h2>
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email" />
        <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="password" />
        {error && <p className="error">{error}</p>}
        <button disabled={loading}>{loading ? 'Signing in...' : 'Sign In'}</button>
      </form>
    </main>
  );
};
