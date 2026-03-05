import { formatCurrency } from '../../../utils/format';

export const BalanceWidget = ({ amount }: { amount: number }) => (
  <div className="card"><h3>Wallet Balance</h3><p>{formatCurrency(amount)}</p></div>
);
