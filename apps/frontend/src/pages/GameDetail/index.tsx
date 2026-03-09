import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useApolloClient, useMutation } from '@apollo/client';
import { PLACE_BET_MUTATION } from '../../graphql/mutations';
import {
  ACTIVE_GAME_ROUND_QUERY,
  BET_HISTORY_QUERY,
  RECENT_GAME_RESULTS_QUERY,
  ROULETTE_SNAPSHOT_QUERY,
  WALLET_BALANCE_QUERY,
} from '../../graphql/queries';
import { formatCurrency } from '../../utils/format';
import { ROULETTE_GAME_ID } from '../../utils/constants';
import { useRealtime } from '../../app/providers/RealtimeProvider';
import { connectRealtime, RealtimeMessage } from '../../services/realtime';

type BetType = 'NUMBER' | 'COLOR' | 'ODD_EVEN';
type RoundStatus = 'BETTING' | 'SETTLING';
type RouletteColor = 'RED' | 'BLACK' | 'GREEN';

type UserBet = {
  id: string;
  roundId: string;
  amount: number;
  status: 'PENDING' | 'WON' | 'LOST';
  payout: number | null;
  netChange: number | null;
  betType: BetType;
  betValue: string;
  winningNumber: number | null;
  winningColor: RouletteColor | null;
  multiplier: number | null;
  createdAt: string;
  resolvedAt: string | null;
};

type ActiveRound = {
  id: string;
  gameId: string;
  status: RoundStatus;
  startsAt: string;
  endsAt: string;
  timeRemainingSec: number;
  totalBets: number;
  pot: number;
};

type GameResult = {
  roundId: string;
  gameId: string;
  winningNumber: number;
  winningColor: RouletteColor;
  resolvedAt: string;
  totalBets: number;
  totalWagered: number;
  totalPayout: number;
};

type SnapshotPayload = {
  activeRound: ActiveRound | null;
  recentResults: GameResult[];
  myBets: UserBet[];
  wallet: { id: string; amount: number; currency: string };
};

type RouletteSnapshotQuery = {
  rouletteSnapshot: SnapshotPayload;
};

type WalletBalanceQuery = {
  walletBalance: { id: string; amount: number; currency: string } | null;
};

type ActiveGameRoundQuery = {
  activeGameRound: ActiveRound | null;
};

type RecentGameResultsQuery = {
  recentGameResults: GameResult[];
};

type BetHistoryQuery = {
  betHistory: UserBet[];
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
const POCKET_LABEL_RADIUS = 46;
const WALLET_CACHE_KEY = 'roulette:lastKnownWallet';

const numberClass = (value: number): 'red' | 'black' | 'green' => {
  if (value === 0) return 'green';
  const reds = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
  return reds.has(value) ? 'red' : 'black';
};

const wheelColor = (value: number) => {
  if (value === 0) return '#2f8b5b';
  return numberClass(value) === 'red' ? '#8e2a2a' : '#111111';
};

const normalizeBetValue = (type: BetType, rawValue: string) => {
  if (type === 'NUMBER') {
    return String(Math.floor(Number(rawValue) || 0));
  }
  return rawValue.toUpperCase();
};

const getStaticRotationForNumber = (pockets: WheelPocket[], winningNumber: number) => {
  const pocket = pockets.find((item) => item.value === winningNumber);
  const targetPocketAngle = pocket?.angle ?? 0;
  return ((360 - targetPocketAngle) % 360 + 360) % 360;
};

const computeTargetRotation = (pockets: WheelPocket[], currentRotation: number, winningNumber: number) => {
  const pocket = pockets.find((item) => item.value === winningNumber);
  const targetPocketAngle = pocket?.angle ?? 0;
  const currentNormalized = ((currentRotation % 360) + 360) % 360;
  const desiredNormalized = ((360 - targetPocketAngle) % 360 + 360) % 360;
  let delta = desiredNormalized - currentNormalized;
  if (delta < 0) delta += 360;
  const fullTurns = 360 * (8 + Math.floor(Math.random() * 2));
  return currentRotation + fullTurns + delta;
};

const computeBallTargetRotation = (currentBallRotation: number) => {
  const travelTurns = 360 * (10 + Math.floor(Math.random() * 2));
  return currentBallRotation - travelTurns;
};

export function GameDetailPage() {
  const { notify } = useRealtime();
  const [betType, setBetType] = useState<BetType>('COLOR');
  const [betValue, setBetValue] = useState('RED');
  const [stakeInput, setStakeInput] = useState('25');
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [wheelRotation, setWheelRotation] = useState(0);
  const [ballOrbitRotation, setBallOrbitRotation] = useState(0);
  const [lastResult, setLastResult] = useState<GameResult | null>(null);
  const [wsActiveRound, setWsActiveRound] = useState<ActiveRound | null>(null);
  const [wsRecentResults, setWsRecentResults] = useState<GameResult[] | null>(null);
  const [wsMyBets, setWsMyBets] = useState<UserBet[] | null>(null);
  const [wsBalance, setWsBalance] = useState<number | null>(() => {
    const raw = localStorage.getItem(WALLET_CACHE_KEY);
    if (!raw) return null;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : null;
  });
  const [clockMs, setClockMs] = useState(() => Date.now());
  const [realtimeConnected, setRealtimeConnected] = useState(false);
  const [supportsSnapshot, setSupportsSnapshot] = useState<boolean | null>(null);

  const spinTimeoutRef = useRef<number | null>(null);
  const hydratedRoundRef = useRef(false);
  const lastAnimatedRoundIdRef = useRef<string | null>(null);
  const hydratedBetNotificationsRef = useRef(false);
  const notifiedBetIdsRef = useRef<Set<string>>(new Set());
  const pendingBetNotificationsRef = useRef<Map<string, UserBet>>(new Map());
  const latestBetsRef = useRef<UserBet[]>([]);
  const syncStateRef = useRef<() => Promise<void>>(async () => undefined);
  const settlementSyncedRoundIdsRef = useRef<Set<string>>(new Set());
  const apolloClient = useApolloClient();

  const [placeBet, { loading: placingBet }] = useMutation(PLACE_BET_MUTATION);

  const setWalletAmount = useCallback((amount: number | null) => {
    setWsBalance(amount);
    if (amount === null || !Number.isFinite(amount)) return;
    localStorage.setItem(WALLET_CACHE_KEY, String(amount));
  }, []);

  const applySnapshot = useCallback((snapshot: SnapshotPayload) => {
    setWsActiveRound(snapshot.activeRound ?? null);
    setWsRecentResults(snapshot.recentResults ?? []);
    setWsMyBets(snapshot.myBets ?? []);
    setWalletAmount(snapshot.wallet?.amount ?? null);
  }, [setWalletAmount]);

  const fetchLegacyState = useCallback(async () => {
    try {
      const [walletResponse, roundResponse, resultsResponse, betsResponse] = await Promise.all([
        apolloClient.query<WalletBalanceQuery>({
          query: WALLET_BALANCE_QUERY,
          fetchPolicy: 'network-only',
        }),
        apolloClient.query<ActiveGameRoundQuery>({
          query: ACTIVE_GAME_ROUND_QUERY,
          variables: { gameId: ROULETTE_GAME_ID },
          fetchPolicy: 'network-only',
        }),
        apolloClient.query<RecentGameResultsQuery>({
          query: RECENT_GAME_RESULTS_QUERY,
          variables: { gameId: ROULETTE_GAME_ID, limit: 5 },
          fetchPolicy: 'network-only',
        }),
        apolloClient.query<BetHistoryQuery>({
          query: BET_HISTORY_QUERY,
          variables: { gameId: ROULETTE_GAME_ID, page: 1, size: 5 },
          fetchPolicy: 'network-only',
        }),
      ]);

      const walletAmount = walletResponse.data?.walletBalance?.amount;
      if (walletAmount !== undefined) {
        setWalletAmount(walletAmount);
      }
      setWsActiveRound(roundResponse.data?.activeGameRound ?? null);
      setWsRecentResults(resultsResponse.data?.recentGameResults ?? []);
      setWsMyBets(betsResponse.data?.betHistory ?? []);
      return true;
    } catch {
      return false;
    }
  }, [apolloClient, setWalletAmount]);

  const fetchSnapshot = useCallback(async () => {
    try {
      const response = await apolloClient.query<RouletteSnapshotQuery>({
        query: ROULETTE_SNAPSHOT_QUERY,
        variables: { gameId: ROULETTE_GAME_ID },
        fetchPolicy: 'network-only',
      });
      if (response.data?.rouletteSnapshot) {
        applySnapshot(response.data.rouletteSnapshot);
        if (supportsSnapshot !== true) {
          setSupportsSnapshot(true);
        }
      }
      return true;
    } catch {
      if (supportsSnapshot !== false) {
        setSupportsSnapshot(false);
      }
      return fetchLegacyState();
    }
  }, [apolloClient, applySnapshot, fetchLegacyState, supportsSnapshot]);

  const syncState = useCallback(async () => {
    if (supportsSnapshot === false) {
      await fetchLegacyState();
      return;
    }
    await fetchSnapshot();
  }, [fetchLegacyState, fetchSnapshot, supportsSnapshot]);

  const balance = wsBalance ?? 0;
  const activeRound = wsActiveRound;
  const recentResults = wsRecentResults ?? [];
  const myBets = wsMyBets ?? [];
  const timeRemainingSec = activeRound ? Math.max(0, Math.ceil((Date.parse(activeRound.endsAt) - clockMs) / 1000)) : 0;

  useEffect(() => {
    latestBetsRef.current = myBets;
  }, [myBets]);

  useEffect(() => {
    syncStateRef.current = syncState;
  }, [syncState]);

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
    const timer = window.setInterval(() => {
      setClockMs(Date.now());
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    void syncState();
  }, [syncState]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    const disconnect = connectRealtime({
      token,
      onOpen: () => {
        setRealtimeConnected(true);
      },
      onClose: () => {
        setRealtimeConnected(false);
      },
      onMessage: (message: RealtimeMessage) => {
        if (message.type === 'snapshot') {
          applySnapshot(message.payload as SnapshotPayload);
          return;
        }

        if (message.type === 'round:update') {
          setWsActiveRound((message.payload ?? null) as ActiveRound | null);
          return;
        }

        if (message.type === 'round:result') {
          const incoming = message.payload as GameResult;
          setWsRecentResults((current) => {
            const existing = current ?? [];
            const deduped = [incoming, ...existing.filter((entry) => entry.roundId !== incoming.roundId)];
            return deduped.slice(0, 5);
          });

          const hadPendingBetInRound = latestBetsRef.current.some(
            (bet) => bet.roundId === incoming.roundId && bet.status === 'PENDING',
          );
          if (hadPendingBetInRound && !settlementSyncedRoundIdsRef.current.has(incoming.roundId)) {
            settlementSyncedRoundIdsRef.current.add(incoming.roundId);
            window.setTimeout(() => {
              void syncStateRef.current();
            }, SPIN_SETTLE_DELAY_MS + 240);
          }
          return;
        }

        if (message.type === 'bet:update') {
          const incoming = message.payload as UserBet;
          setWsMyBets((current) => {
            const existing = current ?? [];
            const deduped = [incoming, ...existing.filter((entry) => entry.id !== incoming.id)];
            return deduped.slice(0, 5);
          });
          return;
        }

        if (message.type === 'wallet:update') {
          setWalletAmount(message.payload.amount);
          return;
        }

        if (message.type === 'session:expired') {
          localStorage.removeItem('token');
          localStorage.removeItem(WALLET_CACHE_KEY);
          window.location.replace('/');
        }
      },
    });

    return disconnect;
  }, [applySnapshot, setWalletAmount]);

  useEffect(() => {
    if (realtimeConnected) return;

    const fallbackInterval = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      void syncState();
    }, 15000);

    return () => window.clearInterval(fallbackInterval);
  }, [realtimeConnected, syncState]);

  const emitBetResultNotification = useCallback(
    (bet: UserBet) => {
      const won = (bet.netChange ?? 0) >= 0;
      notify({
        title: `Round ${bet.roundId} Result`,
        tone: won ? 'success' : 'error',
        message: won
          ? `You won ${formatCurrency(bet.netChange ?? 0)} on ${bet.betType} ${bet.betValue}.`
          : `You lost ${formatCurrency(Math.abs(bet.netChange ?? 0))} on ${bet.betType} ${bet.betValue}.`,
      });
    },
    [notify],
  );

  useEffect(() => {
    return () => {
      if (spinTimeoutRef.current !== null) {
        window.clearTimeout(spinTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const latest = recentResults[0];
    if (!latest) return;

    if (!hydratedRoundRef.current) {
      hydratedRoundRef.current = true;
      lastAnimatedRoundIdRef.current = latest.roundId;
      setLastResult(latest);
      setWheelRotation(getStaticRotationForNumber(wheelPockets, latest.winningNumber));
      return;
    }

    if (latest.roundId === lastAnimatedRoundIdRef.current) return;

    lastAnimatedRoundIdRef.current = latest.roundId;
    setIsSpinning(true);
    setError(null);
    setFeedback(`Round ${latest.roundId} resolved. Spinning wheel to result...`);

    setWheelRotation((current) => computeTargetRotation(wheelPockets, current, latest.winningNumber));
    setBallOrbitRotation((current) => computeBallTargetRotation(current));

    if (spinTimeoutRef.current !== null) {
      window.clearTimeout(spinTimeoutRef.current);
    }
    spinTimeoutRef.current = window.setTimeout(() => {
      setLastResult(latest);
      setIsSpinning(false);
      setFeedback(null);
    }, SPIN_SETTLE_DELAY_MS);
  }, [recentResults, wheelPockets]);

  useEffect(() => {
    if (!myBets.length) {
      return;
    }

    if (!hydratedBetNotificationsRef.current) {
      hydratedBetNotificationsRef.current = true;
      myBets.forEach((bet) => {
        if (bet.status !== 'PENDING') {
          notifiedBetIdsRef.current.add(bet.id);
        }
      });
      return;
    }

    myBets.forEach((bet) => {
      if (bet.status === 'PENDING') {
        return;
      }
      if (notifiedBetIdsRef.current.has(bet.id)) {
        return;
      }

      notifiedBetIdsRef.current.add(bet.id);
      const shouldQueueUntilSpinCompletes = isSpinning || !lastResult || bet.roundId !== lastResult.roundId;
      if (shouldQueueUntilSpinCompletes) {
        pendingBetNotificationsRef.current.set(bet.id, bet);
        return;
      }

      emitBetResultNotification(bet);
    });
  }, [emitBetResultNotification, isSpinning, lastResult, myBets]);

  useEffect(() => {
    if (isSpinning || !lastResult || pendingBetNotificationsRef.current.size === 0) {
      return;
    }

    const idsToNotify: string[] = [];
    for (const [id, bet] of pendingBetNotificationsRef.current.entries()) {
      if (bet.roundId === lastResult.roundId) {
        idsToNotify.push(id);
      }
    }

    idsToNotify.forEach((id) => {
      const bet = pendingBetNotificationsRef.current.get(id);
      if (!bet) {
        return;
      }
      emitBetResultNotification(bet);
      pendingBetNotificationsRef.current.delete(id);
    });
  }, [emitBetResultNotification, isSpinning, lastResult]);

  const resetBetValueForType = (type: BetType) => {
    if (type === 'NUMBER') setBetValue('7');
    if (type === 'COLOR') setBetValue('RED');
    if (type === 'ODD_EVEN') setBetValue('ODD');
  };

  const handlePlaceBet = async () => {
    if (!activeRound || activeRound.status !== 'BETTING') {
      setError('Round is settling. Wait for the next round to open.');
      return;
    }

    const amount = Number(stakeInput);
    if (!Number.isFinite(amount) || amount <= 0) {
      setError('Enter a valid stake amount');
      return;
    }

    setError(null);
    setFeedback(null);

    try {
      const response = await placeBet({
        variables: {
          gameId: ROULETTE_GAME_ID,
          amount,
          betType,
          betValue: normalizeBetValue(betType, betValue),
        },
      });

      const placedBet = response.data?.placeBet as UserBet | undefined;
      if (!placedBet) {
        throw new Error('Bet was not accepted');
      }

      setFeedback(`Bet accepted for round ${placedBet.roundId}. Waiting for spin.`);
      if (!realtimeConnected) {
        await syncState();
      }
    } catch (placeError: any) {
      setError(placeError.message || 'Unable to place bet');
    }
  };

  return (
    <main className="page roulette-page">
      <section className="roulette-top">
        <div className="card hero-card">
          <p className="eyebrow">Live Table</p>
          <h2>Russian Roulette</h2>
          <p className="muted-text">One shared game spins every minute. All logged-in players bet on the same round.</p>
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
            {activeRound ? (
              <>
                <p className="muted-text">Round: {activeRound.id}</p>
                <p className="muted-text">
                  Status: {activeRound.status} | Next spin in {timeRemainingSec}s
                </p>
                <p className="muted-text">
                  Pot: {formatCurrency(activeRound.pot)} | Bets: {activeRound.totalBets}
                </p>
              </>
            ) : (
              <p className="muted-text">Waiting for logged-in players to start the next round.</p>
            )}
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
          {feedback ? <p className="muted-text">{feedback}</p> : null}
          <button
            className="btn play-btn"
            type="button"
            disabled={placingBet || isSpinning || !activeRound || activeRound.status !== 'BETTING'}
            onClick={handlePlaceBet}
          >
            {placingBet ? 'Placing Bet...' : 'Join Current Round'}
          </button>
        </article>
      </section>

      <section className="roulette-grid">
        <article className="card outcome-card">
          <h3>Latest Result</h3>
          {isSpinning ? (
            <div className="outcome-grid">
              <p className="muted-text">Round resolved. Wheel is animating to winning pocket...</p>
            </div>
          ) : lastResult ? (
            <div className="outcome-grid">
              <div className={`result-badge ${lastResult.winningColor.toLowerCase()}`}>
                {lastResult.winningNumber} {lastResult.winningColor}
              </div>
              <p>Round: {lastResult.roundId}</p>
              <p>Total Bets: {lastResult.totalBets}</p>
              <p>Total Wagered: {formatCurrency(lastResult.totalWagered)}</p>
              <p>Total Payout: {formatCurrency(lastResult.totalPayout)}</p>
            </div>
          ) : (
            <p className="muted-text">No results yet. The first round will resolve in one minute.</p>
          )}
        </article>

        <article className="card history-card">
          <h3>Last 5 Results</h3>
          <div className="history-list">
            {recentResults.length === 0 ? (
              <p className="muted-text">No completed rounds yet.</p>
            ) : (
              recentResults.map((result) => (
                <div key={result.roundId} className="history-row">
                  <div>
                    <p className="history-title">Round {result.roundId}</p>
                    <p className="muted-text">
                      Winning: {result.winningNumber} {result.winningColor}
                    </p>
                  </div>
                  <div className="history-amount">
                    <span>{new Date(result.resolvedAt).toLocaleTimeString()}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </article>

        <article className="card history-card">
          <h3>My Last 5 Bets</h3>
          <div className="history-list">
            {myBets.length === 0 ? (
              <p className="muted-text">No bets placed yet.</p>
            ) : (
              myBets.map((bet) => (
                <div key={bet.id} className="history-row">
                  <div>
                    <p className="history-title">
                      {bet.status} | {bet.betType} {bet.betValue}
                    </p>
                    <p className="muted-text">Round {bet.roundId}</p>
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
        </article>
      </section>
    </main>
  );
}
