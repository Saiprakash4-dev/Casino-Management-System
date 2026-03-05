import { useQuery } from '@apollo/client';
import { BET_HISTORY_QUERY, TRANSACTIONS_QUERY } from '../../../graphql/queries';
import { PageShell } from '../../components/layout/PageShell';

export const AdminPage = () => {
  const bets = useQuery(BET_HISTORY_QUERY, { variables: { gameId: 'all', page: 0, size: 15 } });
  const tx = useQuery(TRANSACTIONS_QUERY, { variables: { page: 0, size: 15 } });

  return (
    <PageShell>
      <h2>Admin Dashboard</h2>
      <div className="card"><h3>Recent Bets</h3><pre>{JSON.stringify(bets.data?.betHistory ?? [], null, 2)}</pre></div>
      <div className="card"><h3>Recent Transactions</h3><pre>{JSON.stringify(tx.data?.transactions ?? [], null, 2)}</pre></div>
    </PageShell>
  );
};
