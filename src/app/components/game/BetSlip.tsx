import { FormEvent, useState } from 'react';
import { validateBetAmount } from '../../../utils/validators';

type Props = {
  minBet: number;
  maxBet: number;
  loading: boolean;
  defaultAmount: number;
  onSubmit: (amount: number) => void;
};

export const BetSlip = ({ minBet, maxBet, loading, defaultAmount, onSubmit }: Props) => {
  const [amount, setAmount] = useState(defaultAmount);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const err = validateBetAmount(amount, minBet, maxBet);
    setError(err);
    if (err) return;
    onSubmit(amount);
  };

  return (
    <form className="card" onSubmit={handleSubmit}>
      <h3>Bet Slip</h3>
      <label>Amount</label>
      <input type="number" min={minBet} max={maxBet} value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
      {error && <p className="error">{error}</p>}
      <button disabled={loading}>{loading ? 'Placing...' : 'Place Bet'}</button>
    </form>
  );
};
