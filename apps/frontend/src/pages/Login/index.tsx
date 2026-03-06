import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../app/providers/AuthProvider';

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, login } = useAuth();
  const [email, setEmail] = useState('admin@casino.dev');
  const [password, setPassword] = useState('password');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const redirectPath = useMemo(() => {
    const state = location.state as { from?: string } | null;
    return state?.from || '/roulette';
  }, [location.state]);

  useEffect(() => {
    if (user) {
      navigate(redirectPath, { replace: true });
    }
  }, [navigate, redirectPath, user]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login(email, password);
      navigate(redirectPath, { replace: true });
    } catch (err: any) {
      setError(err.message || 'Login failed. Try admin@casino.dev / password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-hero">
        <p className="auth-kicker">Table Open</p>
        <h1>Russian Roulette</h1>
        <p className="auth-text">
          Log in to enter the live demo floor, place color or number bets, and watch your bankroll update in real time.
        </p>
        <div className="auth-pills">
          <span>Single Zero Wheel</span>
          <span>Live Dummy Funds</span>
          <span>Instant Payouts</span>
        </div>
      </section>
      <section className="auth-panel">
        <div className="auth-card">
          <h2>Enter Casino</h2>
          <p className="auth-hint">Use demo credentials to continue.</p>
          <form onSubmit={handleSubmit} className="auth-form">
            <label>
              Email
              <input
                className="input"
                placeholder="admin@casino.dev"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </label>
            <label>
              Password
              <input
                className="input"
                type="password"
                placeholder="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </label>
            {error ? <p className="error-text">{error}</p> : null}
            <button className="btn auth-submit" type="submit" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign in and Play'}
            </button>
          </form>
          <p className="auth-demo">Demo: admin@casino.dev / password</p>
        </div>
      </section>
    </main>
  );
}
