import { FormEvent, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { CREDIT_WALLET_MUTATION } from '../../../graphql/mutations';
import { TRANSACTIONS_QUERY, WALLET_BALANCE_QUERY } from '../../../graphql/queries';
import { PageShell } from '../../components/layout/PageShell';
import { BalanceWidget } from '../../components/wallet/BalanceWidget';
import { TransactionTable } from '../../components/wallet/TransactionTable';

export const WalletPage = () => {
  const [amount, setAmount] = useState(50);
  const [reason, setReason] = useState('Demo top-up');
  const wallet = useQuery(WALLET_BALANCE_QUERY);
  const transactions = useQuery(TRANSACTIONS_QUERY, { variables: { page: 0, size: 10 } });

  const [creditWallet, state] = useMutation(CREDIT_WALLET_MUTATION);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    await creditWallet({
      variables: { amount, reason },
      optimisticResponse: {
        creditWallet: {
          __typename: 'Wallet',
          id: wallet.data.walletBalance.id,
          amount: (wallet.data.walletBalance.amount ?? 0) + amount,
          currency: wallet.data.walletBalance.currency,
        },
      },
      update: (cache, { data }) => {
        cache.writeQuery({ query: WALLET_BALANCE_QUERY, data: { walletBalance: data?.creditWallet } });
      },
    });
  };

  return (
    <PageShell>
      <h2>Wallet</h2>
      <BalanceWidget amount={wallet.data?.walletBalance?.amount ?? 0} />
      <form className="card" onSubmit={submit}>
        <h3>Add Dummy Credits</h3>
        <input type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
        <input value={reason} onChange={(e) => setReason(e.target.value)} />
        <button disabled={state.loading}>{state.loading ? 'Processing...' : 'Credit Wallet'}</button>
      </form>
      <TransactionTable transactions={transactions.data?.transactions ?? []} />
    </PageShell>
  );
};
