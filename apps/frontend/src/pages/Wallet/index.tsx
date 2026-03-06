import { BalanceWidget } from '../../components/wallet/BalanceWidget';
import { TransactionTable } from '../../components/wallet/TransactionTable';

export function WalletPage() {
  return (
    <main className="container">
      <h2>Wallet</h2>
      <BalanceWidget />
      <TransactionTable />
    </main>
  );
}
