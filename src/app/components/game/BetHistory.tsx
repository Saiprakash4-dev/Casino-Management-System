type Bet = { id: string; amount: number; status: string; payout: number; createdAt: string };

export const BetHistory = ({ bets }: { bets: Bet[] }) => (
  <div className="card">
    <h3>Bet History</h3>
    {bets.map((bet) => (
      <p key={bet.id}>{bet.createdAt}: ${bet.amount} - {bet.status} (payout ${bet.payout})</p>
    ))}
  </div>
);
