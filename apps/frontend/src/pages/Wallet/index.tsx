import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { CREDIT_WALLET_MUTATION } from '../../graphql/mutations';
import { TRANSACTIONS_QUERY, WALLET_BALANCE_QUERY } from '../../graphql/queries';
import { formatCurrency } from '../../utils/format';

type Transaction = {
  id: string;
  amount: number;
  type: string;
  reason: string;
  createdAt: string;
};

export function WalletPage() {
  const [customAmount, setCustomAmount] = useState('500');
  const [reason, setReason] = useState('Manual bankroll top-up');
  const [error, setError] = useState<string | null>(null);

  const { data: walletData, refetch: refetchWallet } = useQuery(WALLET_BALANCE_QUERY, {
    fetchPolicy: 'network-only',
  });
  const { data: transactionsData, refetch: refetchTransactions } = useQuery(TRANSACTIONS_QUERY, {
    variables: { page: 1, size: 30 },
    fetchPolicy: 'network-only',
  });

  const [creditWallet, { loading: crediting }] = useMutation(CREDIT_WALLET_MUTATION, {
    onCompleted: async () => {
      setError(null);
      await Promise.all([refetchWallet(), refetchTransactions()]);
    },
    onError: (mutationError) => setError(mutationError.message),
  });

  const transactions = (transactionsData?.transactions ?? []) as Transaction[];
  const balance = walletData?.walletBalance?.amount ?? 0;

  const quickAdd = async (amount: number, label: string) => {
    await creditWallet({ variables: { amount, reason: label } });
  };

  const handleCustomCredit = async () => {
    const amount = Number(customAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setError('Enter a valid amount to add');
      return;
    }

    await creditWallet({ variables: { amount, reason } });
  };

  return (
    <main className="page funds-page">
      <section className="funds-overview">
        <div className="card funds-balance">
          <p className="eyebrow">Current Bankroll</p>
          <h2>{formatCurrency(balance)}</h2>
          <p className="muted-text">All funds are dummy credits for gameplay only.</p>
          <div className="quick-row">
            <button className="chip" type="button" onClick={() => quickAdd(500, 'Quick top-up +500')}>
              +$500
            </button>
            <button className="chip" type="button" onClick={() => quickAdd(1000, 'Quick top-up +1000')}>
              +$1,000
            </button>
            <button className="chip" type="button" onClick={() => quickAdd(5000, 'Quick top-up +5000')}>
              +$5,000
            </button>
          </div>
        </div>

        <div className="card funds-form">
          <h3>Add Custom Funds</h3>
          <label className="form-row">
            Amount
            <input
              className="input"
              type="number"
              min={1}
              value={customAmount}
              onChange={(e) => setCustomAmount(e.target.value)}
            />
          </label>
          <label className="form-row">
            Reason
            <input className="input" value={reason} onChange={(e) => setReason(e.target.value)} />
          </label>
          {error ? <p className="error-text">{error}</p> : null}
          <button className="btn" type="button" onClick={handleCustomCredit} disabled={crediting}>
            {crediting ? 'Adding funds...' : 'Add Funds'}
          </button>
        </div>
      </section>

      <section className="card funds-transactions">
        <h3>Funds Activity</h3>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Time</th>
                <th>Type</th>
                <th>Reason</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={4} className="muted-cell">
                    No transactions yet.
                  </td>
                </tr>
              ) : (
                transactions.map((entry) => (
                  <tr key={entry.id}>
                    <td>{new Date(entry.createdAt).toLocaleString()}</td>
                    <td>{entry.type}</td>
                    <td>{entry.reason}</td>
                    <td className={entry.amount >= 0 ? 'win' : 'loss'}>{formatCurrency(entry.amount)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
