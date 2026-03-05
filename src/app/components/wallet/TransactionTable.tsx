import { formatDateTime } from '../../../utils/format';

type Transaction = { id: string; amount: number; type: string; reason: string; createdAt: string };

export const TransactionTable = ({ transactions }: { transactions: Transaction[] }) => (
  <div className="card">
    <h3>Transactions</h3>
    <table>
      <thead><tr><th>Date</th><th>Type</th><th>Amount</th><th>Reason</th></tr></thead>
      <tbody>
        {transactions.map((tx) => (
          <tr key={tx.id}><td>{formatDateTime(tx.createdAt)}</td><td>{tx.type}</td><td>{tx.amount}</td><td>{tx.reason}</td></tr>
        ))}
      </tbody>
    </table>
  </div>
);
