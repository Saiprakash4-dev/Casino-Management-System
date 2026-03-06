export function LoginPage() {
  return (
    <main className="container">
      <div className="card" style={{ maxWidth: 420 }}>
        <h2>Login</h2>
        <input className="input" placeholder="Email" />
        <div style={{ height: 10 }} />
        <input className="input" type="password" placeholder="Password" />
        <div style={{ height: 12 }} />
        <button className="btn">Sign in</button>
      </div>
    </main>
  );
}
