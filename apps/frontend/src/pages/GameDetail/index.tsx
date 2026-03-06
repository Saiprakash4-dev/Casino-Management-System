import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { PLACE_BET_MUTATION } from '../../graphql/mutations';
import { BET_HISTORY_QUERY, WALLET_BALANCE_QUERY } from '../../graphql/queries';
import { formatCurrency } from '../../utils/format';
import { ROULETTE_GAME_ID } from '../../utils/constants';

type BetType = 'NUMBER' | 'COLOR' | 'ODD_EVEN';
type HistoryBet = {
  id: string;
  amount: number;
  status: 'WON' | 'LOST';
  payout: number;
  netChange: number;
  betType: BetType;
  betValue: string;
  winningNumber: number;
  winningColor: 'RED' | 'BLACK' | 'GREEN';
  multiplier: number;
  createdAt: string;
};

type WheelPocket = {
  value: number;
  angle: number;
  x: number;
  y: number;
  colorClass: 'red' | 'black' | 'green';
};

const ROULETTE_WHEEL_SEQUENCE = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18,
  29, 7, 28, 12, 35, 3, 26,
];
const SEGMENT_ANGLE = 360 / ROULETTE_WHEEL_SEQUENCE.length;
const SPIN_DURATION_MS = 4600;
const SPIN_SETTLE_DELAY_MS = SPIN_DURATION_MS + 140;
const POCKET_LABEL_RADIUS = 42.5;

const numberClass = (value: number): 'red' | 'black' | 'green' => {
  if (value === 0) return 'green';
  const reds = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
  return reds.has(value) ? 'red' : 'black';
};

const wheelColor = (value: number) => {
  if (value === 0) return '#2f8b5b';
  return numberClass(value) === 'red' ? '#8e2a2a' : '#111111';
};

export function GameDetailPage() {
  const [betType, setBetType] = useState<BetType>('COLOR');
  const [betValue, setBetValue] = useState('RED');
  const [stakeInput, setStakeInput] = useState('25');
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<HistoryBet | null>(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [wheelRotation, setWheelRotation] = useState(0);
  const [ballOrbitRotation, setBallOrbitRotation] = useState(0);
  const spinTimeoutRef = useRef<number | null>(null);

  const { data: walletData, refetch: refetchWallet } = useQuery(WALLET_BALANCE_QUERY, {
    fetchPolicy: 'network-only',
  });
  const { data: historyData, refetch: refetchHistory } = useQuery(BET_HISTORY_QUERY, {
    variables: { gameId: ROULETTE_GAME_ID, page: 1, size: 8 },
    fetchPolicy: 'network-only',
  });

  const balance = walletData?.walletBalance?.amount ?? 0;
  const history = (historyData?.betHistory ?? []) as HistoryBet[];
  const [placeBet, { loading: placingBet }] = useMutation(PLACE_BET_MUTATION);

  const quickStakes = useMemo(() => [10, 25, 50, 100, 250], []);
  const wheelPockets = useMemo<WheelPocket[]>(
    () =>
      ROULETTE_WHEEL_SEQUENCE.map((value, index) => {
        const angle = index * SEGMENT_ANGLE;
        const radians = (angle * Math.PI) / 180;
        const x = 50 + Math.sin(radians) * POCKET_LABEL_RADIUS;
        const y = 50 - Math.cos(radians) * POCKET_LABEL_RADIUS;
        return { value, angle, x, y, colorClass: numberClass(value) };
      }),
    [],
  );
  const wheelGradient = useMemo(() => {
    const offset = -SEGMENT_ANGLE / 2;
    return `conic-gradient(from ${offset}deg, ${ROULETTE_WHEEL_SEQUENCE.map((value, index) => {
      const start = (index * SEGMENT_ANGLE).toFixed(4);
      const end = ((index + 1) * SEGMENT_ANGLE).toFixed(4);
      return `${wheelColor(value)} ${start}deg ${end}deg`;
    }).join(', ')})`;
  }, []);

  useEffect(() => {
    return () => {
      if (spinTimeoutRef.current !== null) {
        window.clearTimeout(spinTimeoutRef.current);
      }
    };
  }, []);

  const resetBetValueForType = (type: BetType) => {
    if (type === 'NUMBER') setBetValue('7');
    if (type === 'COLOR') setBetValue('RED');
    if (type === 'ODD_EVEN') setBetValue('ODD');
  };

  const getTargetRotation = (winningNumber: number) => {
    const pocket = wheelPockets.find((item) => item.value === winningNumber);
    const targetPocketAngle = pocket?.angle ?? 0;
    const currentNormalized = ((wheelRotation % 360) + 360) % 360;
    const desiredNormalized = ((360 - targetPocketAngle) % 360 + 360) % 360;
    let delta = desiredNormalized - currentNormalized;
    if (delta < 0) delta += 360;
    const fullTurns = 360 * (8 + Math.floor(Math.random() * 2));
    return wheelRotation + fullTurns + delta;
  };

  const getBallTargetRotation = () => {
    const travelTurns = 360 * (10 + Math.floor(Math.random() * 2));
    return ballOrbitRotation - travelTurns;
  };

  const handlePlay = async () => {
    if (isSpinning || placingBet) {
      return;
    }

    const amount = Number(stakeInput);
    if (!Number.isFinite(amount) || amount <= 0) {
      setError('Enter a valid stake amount');
      return;
    }

    setError(null);
    setIsSpinning(true);
    setLastResult(null);

    try {
      const response = await placeBet({
        variables: {
          gameId: ROULETTE_GAME_ID,
          amount,
          betType,
          betValue: betType === 'NUMBER' ? String(Math.floor(Number(betValue) || 0)) : betValue,
        },
      });

      const roundResult = response.data?.placeBet as HistoryBet | undefined;
      if (!roundResult) {
        throw new Error('No spin result returned from server');
      }

      setWheelRotation(getTargetRotation(roundResult.winningNumber));
      setBallOrbitRotation(getBallTargetRotation());

      await new Promise<void>((resolve) => {
        spinTimeoutRef.current = window.setTimeout(() => resolve(), SPIN_SETTLE_DELAY_MS);
      });

      setLastResult(roundResult);
      await Promise.all([refetchWallet(), refetchHistory()]);
    } catch (mutationError: any) {
      setError(mutationError.message || 'Unable to place bet');
    } finally {
      setIsSpinning(false);
    }
  };

  return (
    <main className="page roulette-page">
      <section className="roulette-top">
        <div className="card hero-card">
          <p className="eyebrow">Live Table</p>
          <h2>Russian Roulette</h2>
          <p className="muted-text">
            Choose a number, color, or odd/even lane. Press <strong>Place Bet and Play</strong> to spin.
          </p>
          <div className="wheel-stage">
            <div className="wheel-pointer" />
            <div className="roulette-wheel-shell">
              <div className="roulette-wheel" style={{ backgroundImage: wheelGradient, transform: `rotate(${wheelRotation}deg)` }}>
                {wheelPockets.map((pocket) => (
                  <span
                    key={pocket.value}
                    className={`wheel-number ${pocket.colorClass} ${
                      !isSpinning && lastResult?.winningNumber === pocket.value ? 'hit' : ''
                    }`}
                    style={{ left: `${pocket.x}%`, top: `${pocket.y}%` }}
                  >
                    {pocket.value}
                  </span>
                ))}
                <div className="wheel-core" />
              </div>
              <div className="wheel-ball-orbit" style={{ transform: `translate(-50%, -50%) rotate(${ballOrbitRotation}deg)` }}>
                <span className="wheel-ball" />
              </div>
            </div>
          </div>
        </div>
        <article className="card control-card">
          <div className="balance-inline">
            <p className="eyebrow">Available Funds</p>
            <h3>{formatCurrency(balance)}</h3>
            <p className="muted-text">Table limits: $10 to $1,000 per spin.</p>
          </div>
          <h3>Build Your Bet</h3>
          <div className="bet-type-row">
            {(['COLOR', 'NUMBER', 'ODD_EVEN'] as BetType[]).map((type) => (
              <button
                key={type}
                type="button"
                className={`chip ${betType === type ? 'active' : ''}`}
                onClick={() => {
                  setBetType(type);
                  resetBetValueForType(type);
                }}
              >
                {type === 'ODD_EVEN' ? 'Odd / Even' : type}
              </button>
            ))}
          </div>

          {betType === 'NUMBER' ? (
            <label className="form-row">
              Pick a number (0 to 36)
              <input
                className="input"
                type="number"
                min={0}
                max={36}
                value={betValue}
                onChange={(e) => setBetValue(e.target.value)}
              />
            </label>
          ) : null}

          {betType === 'COLOR' ? (
            <div className="bet-type-row">
              {['RED', 'BLACK', 'GREEN'].map((value) => (
                <button
                  key={value}
                  type="button"
                  className={`chip ${betValue === value ? 'active' : ''}`}
                  onClick={() => setBetValue(value)}
                >
                  {value}
                </button>
              ))}
            </div>
          ) : null}

          {betType === 'ODD_EVEN' ? (
            <div className="bet-type-row">
              {['ODD', 'EVEN'].map((value) => (
                <button
                  key={value}
                  type="button"
                  className={`chip ${betValue === value ? 'active' : ''}`}
                  onClick={() => setBetValue(value)}
                >
                  {value}
                </button>
              ))}
            </div>
          ) : null}

          <label className="form-row">
            Stake
            <input
              className="input"
              type="number"
              min={10}
              step={1}
              value={stakeInput}
              onChange={(e) => setStakeInput(e.target.value)}
            />
          </label>
          <div className="quick-row">
            {quickStakes.map((value) => (
              <button key={value} type="button" className="chip" onClick={() => setStakeInput(String(value))}>
                ${value}
              </button>
            ))}
          </div>
          {error ? <p className="error-text">{error}</p> : null}
          <button className="btn play-btn" type="button" disabled={placingBet || isSpinning} onClick={handlePlay}>
            {isSpinning || placingBet ? 'Wheel Spinning...' : 'Place Bet and Play'}
          </button>
        </article>
      </section>

      <section className="roulette-grid">
        <article className="card outcome-card">
          <h3>Spin Result</h3>
          {isSpinning ? (
            <div className="outcome-grid">
              <p className="muted-text">Wheel is spinning... waiting for the ball to settle.</p>
            </div>
          ) : lastResult ? (
            <div className="outcome-grid">
              <div className={`result-badge ${lastResult.winningColor.toLowerCase()}`}>
                {lastResult.winningNumber} {lastResult.winningColor}
              </div>
              <p>
                Bet: {lastResult.betType} {lastResult.betValue}
              </p>
              <p>Status: {lastResult.status}</p>
              <p>Payout: {formatCurrency(lastResult.payout)}</p>
              <p>Net: {formatCurrency(lastResult.netChange)}</p>
              <p>Multiplier: {lastResult.multiplier}x</p>
            </div>
          ) : (
            <p className="muted-text">No spin yet. Place your first bet.</p>
          )}
        </article>

        <article className="card history-card">
          <h3>Recent Spins</h3>
          <div className="history-list">
            {history.length === 0 ? (
              <p className="muted-text">No bets placed yet.</p>
            ) : (
              history.map((item) => (
                <div key={item.id} className="history-row">
                  <div>
                    <p className="history-title">
                      {item.betType} {item.betValue}
                    </p>
                    <p className="muted-text">
                      Result: {item.winningNumber} {item.winningColor}
                    </p>
                  </div>
                  <div className="history-amount">
                    <span className={item.netChange >= 0 ? 'win' : 'loss'}>{formatCurrency(item.netChange)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </article>
      </section>
    </main>
  );
}
