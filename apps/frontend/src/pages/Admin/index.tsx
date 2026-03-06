export function AdminPage() {
  return (
    <main className="container">
      <h2>Admin Console</h2>
      <div className="grid">
        <div className="card"><h3>Online Players</h3><div className="stat">142</div></div>
        <div className="card"><h3>Open Bets</h3><div className="stat">879</div></div>
        <div className="card"><h3>Payout Queue</h3><div className="stat">12</div></div>
      </div>
    </main>
  );
}
