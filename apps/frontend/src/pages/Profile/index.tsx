import { useMemo } from 'react';
import { useQuery } from '@apollo/client';
import { BET_HISTORY_QUERY, ME_QUERY, WALLET_BALANCE_QUERY } from '../../graphql/queries';
import { formatCurrency } from '../../utils/format';
import { ROULETTE_GAME_ID } from '../../utils/constants';

type HistoryBet = {
  id: string;
  amount: number;
  status: 'PENDING' | 'WON' | 'LOST';
  payout: number | null;
  netChange: number | null;
  betType: string;
  betValue: string;
  winningNumber: number | null;
  winningColor: string | null;
  createdAt: string;
};

export function ProfilePage() {
  const { data: userData } = useQuery(ME_QUERY, { fetchPolicy: 'network-only' });
  const { data: walletData } = useQuery(WALLET_BALANCE_QUERY, { fetchPolicy: 'network-only' });
  const { data: historyData } = useQuery(BET_HISTORY_QUERY, {
    variables: { gameId: ROULETTE_GAME_ID, page: 1, size: 50 },
    fetchPolicy: 'network-only',
  });

  const user = userData?.me;
  const balance = walletData?.walletBalance?.amount ?? 0;
  const bets = (historyData?.betHistory ?? []) as HistoryBet[];

  const stats = useMemo(() => {
    const totalBets = bets.length;
    const wins = bets.filter((bet) => bet.status === 'WON').length;
    const totalWagered = bets.reduce((sum, bet) => sum + bet.amount, 0);
    const net = bets.reduce((sum, bet) => sum + (bet.netChange ?? 0), 0);
    const winRate = totalBets ? (wins / totalBets) * 100 : 0;

    return { totalBets, wins, totalWagered, net, winRate };
  }, [bets]);

  return (
    <main className="page profile-page">
      <section className="profile-grid">
        <article className="card profile-main">
          <p className="eyebrow">Player Identity</p>
          <h2>{user?.email ?? 'Guest'}</h2>
          <p className="muted-text">Roles: {(user?.roles ?? ['USER']).join(', ')}</p>
          <div className="profile-badges">
            <span>Verified</span>
            <span>Single Account</span>
            <span>Demo Mode</span>
          </div>
        </article>
        <article className="card profile-main">
          <p className="eyebrow">Bankroll Snapshot</p>
          <h2>{formatCurrency(balance)}</h2>
          <p className="muted-text">Current available dummy funds for Russian Roulette.</p>
        </article>
      </section>

      <section className="profile-stats">
        <article className="card stat-card">
          <p>Total Bets</p>
          <h3>{stats.totalBets}</h3>
        </article>
        <article className="card stat-card">
          <p>Win Rate</p>
          <h3>{stats.winRate.toFixed(1)}%</h3>
        </article>
        <article className="card stat-card">
          <p>Total Wagered</p>
          <h3>{formatCurrency(stats.totalWagered)}</h3>
        </article>
        <article className="card stat-card">
          <p>Net P/L</p>
          <h3 className={stats.net >= 0 ? 'win' : 'loss'}>{formatCurrency(stats.net)}</h3>
        </article>
      </section>

      <section className="card profile-history">
        <h3>Recent Bet Journal</h3>
        <div className="history-list">
          {bets.length === 0 ? (
            <p className="muted-text">No rounds played yet.</p>
          ) : (
            bets.slice(0, 8).map((bet) => (
              <div key={bet.id} className="history-row">
                <div>
                  <p className="history-title">
                    {bet.betType} {bet.betValue}
                  </p>
                  <p className="muted-text">
                    {bet.status === 'PENDING'
                      ? 'Waiting for round resolution'
                      : `Wheel: ${bet.winningNumber} ${bet.winningColor}`}
                  </p>
                </div>
                <div className="history-amount">
                  {bet.status === 'PENDING' ? (
                    <span className="muted-text">Pending</span>
                  ) : (
                    <span className={(bet.netChange ?? 0) >= 0 ? 'win' : 'loss'}>
                      {formatCurrency(bet.netChange ?? 0)}
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </main>
  );
}
