import { Consumer, Kafka, Producer } from 'kafkajs';

type BetType = 'NUMBER' | 'COLOR' | 'ODD_EVEN';
type RouletteColor = 'RED' | 'BLACK' | 'GREEN';

type MockUser = { id: string; email: string; roles: string[] };
type Game = { id: string; name: string; description: string; minBet: number; maxBet: number; status: string };
type Wallet = { id: string; amount: number; currency: string };
type Transaction = { id: string; amount: number; type: string; reason: string; createdAt: string };
type BetRecord = {
  id: string;
  userId: string;
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
  gameId: string;
};
type PublicBetRecord = Omit<BetRecord, 'userId'>;
type Session = { token: string; user: MockUser; createdAt: string };
type UserState = { wallet: Wallet; transactions: Transaction[]; bets: BetRecord[] };
type GameRoundState = {
  id: string;
  gameId: string;
  status: 'BETTING' | 'SETTLING';
  startsAt: string;
  endsAt: string;
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
type RoundView = GameRoundState & { timeRemainingSec: number };
export type RealtimeMessage =
  | {
      type: 'snapshot';
      payload: {
        activeRound: RoundView | null;
        recentResults: GameResult[];
        myBets: PublicBetRecord[];
        wallet: Wallet;
      };
    }
  | { type: 'round:update'; payload: RoundView | null }
  | { type: 'round:result'; payload: GameResult }
  | { type: 'bet:update'; payload: PublicBetRecord }
  | { type: 'wallet:update'; payload: Wallet }
  | { type: 'session:expired'; payload: { reason: string } };
type RealtimeClient = {
  id: string;
  token: string;
  userId: string;
  send: (message: RealtimeMessage) => void;
};

export type ResolverContext = { token?: string | null };

const MOCK_USERS: Record<'user1' | 'admin', MockUser> = {
  user1: { id: 'user-1', email: 'player@casino.dev', roles: ['USER'] },
  admin: { id: 'admin-1', email: 'admin@casino.dev', roles: ['ADMIN', 'USER'] },
};

const MOCK_CREDENTIALS: Record<string, { user: MockUser; password: string }> = {
  'player@casino.dev': { user: MOCK_USERS.user1, password: 'password' },
  'admin@casino.dev': { user: MOCK_USERS.admin, password: 'password' },
};

const ROULETTE_GAME_ID = 'roulette-1';
const STARTING_BALANCE = 5000;
const ROUND_DURATION_MS = Math.max(10_000, Number(process.env.ROULETTE_ROUND_MS || 60_000));
const KAFKA_BROKER = process.env.KAFKA_BROKER ?? 'localhost:9092';
const KAFKA_GROUP_ID = process.env.KAFKA_GROUP_ID ?? `api-gateway-roulette-${process.pid}`;
const MAX_RESULT_HISTORY = 5;

const KAFKA_TOPICS = {
  betPlaced: 'casino.roulette.bet.placed',
  roundResolved: 'casino.roulette.round.resolved',
};

const RED_NUMBERS = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
const MOCK_GAMES: Game[] = [
  {
    id: ROULETTE_GAME_ID,
    name: 'Russian Roulette',
    description: 'Round-based roulette table, one spin per minute',
    minBet: 10,
    maxBet: 1000,
    status: 'WAITING',
  },
];

const USER_STATES = new Map<string, UserState>();
const SESSIONS = new Map<string, Session>();
const PENDING_ROUND_BETS = new Map<string, BetRecord[]>();
const ROUND_RESULTS: GameResult[] = [];
const ROUND_RESULT_IDS = new Set<string>();
const REALTIME_CLIENTS = new Map<string, RealtimeClient>();
const REALTIME_PUSHED_RESULT_IDS = new Set<string>();
const REALTIME_PUSHED_RESULT_ORDER: string[] = [];
const MAX_REALTIME_RESULT_ID_CACHE = 500;

let activeRound: GameRoundState | null = null;
let engineInterval: NodeJS.Timeout | null = null;
let kafkaProducer: Producer | null = null;
let kafkaConsumer: Consumer | null = null;
let kafkaInitialized = false;
let rouletteSystemStarted = false;

const roundToCents = (value: number) => Math.round(value * 100) / 100;

const createToken = () => `session-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

const normalizeEmail = (value: unknown) => {
  if (typeof value !== 'string') return '';
  const cleaned = value.trim().toLowerCase();
  return cleaned.endsWith('@') ? `${cleaned}casino.dev` : cleaned;
};

const rouletteColor = (number: number): RouletteColor => {
  if (number === 0) return 'GREEN';
  return RED_NUMBERS.has(number) ? 'RED' : 'BLACK';
};

const toPageWindow = (page: unknown, size: unknown) => {
  const safePage = Math.max(1, Number(page) || 1);
  const safeSize = Math.max(1, Math.min(100, Number(size) || 10));
  const start = (safePage - 1) * safeSize;
  return { start, safeSize };
};

const parseEvent = <T>(value: Buffer | null): T | null => {
  if (!value) return null;
  try {
    return JSON.parse(value.toString('utf-8')) as T;
  } catch {
    return null;
  }
};

const upsertRoundResult = (result: GameResult) => {
  if (ROUND_RESULT_IDS.has(result.roundId)) return;
  ROUND_RESULTS.unshift(result);
  ROUND_RESULT_IDS.add(result.roundId);
  if (ROUND_RESULTS.length > MAX_RESULT_HISTORY) {
    const removed = ROUND_RESULTS.pop();
    if (removed) {
      ROUND_RESULT_IDS.delete(removed.roundId);
    }
  }
};

const getOrCreateUserState = (userId: string): UserState => {
  const existing = USER_STATES.get(userId);
  if (existing) return existing;

  const created: UserState = {
    wallet: { id: `wallet-${userId}`, amount: STARTING_BALANCE, currency: 'USD' },
    transactions: [
      {
        id: `txn-boot-${userId}`,
        amount: STARTING_BALANCE,
        type: 'CREDIT',
        reason: 'Starting demo bankroll',
        createdAt: new Date(Date.now() - 86400000).toISOString(),
      },
    ],
    bets: [],
  };
  USER_STATES.set(userId, created);
  return created;
};

const addUserTransaction = (userState: UserState, amount: number, type: string, reason: string, createdAt = new Date().toISOString()) => {
  userState.transactions.unshift({
    id: `txn-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
    amount: roundToCents(amount),
    type,
    reason,
    createdAt,
  });
};

const toRoundView = (round: GameRoundState): RoundView => ({
  ...round,
  timeRemainingSec: Math.max(0, Math.ceil((Date.parse(round.endsAt) - Date.now()) / 1000)),
});

const toPublicBet = (bet: BetRecord): PublicBetRecord => {
  const { userId: _ignoredUserId, ...publicBet } = bet;
  return publicBet;
};

const trackPushedRoundResult = (roundId: string) => {
  if (REALTIME_PUSHED_RESULT_IDS.has(roundId)) {
    return false;
  }
  REALTIME_PUSHED_RESULT_IDS.add(roundId);
  REALTIME_PUSHED_RESULT_ORDER.push(roundId);
  if (REALTIME_PUSHED_RESULT_ORDER.length > MAX_REALTIME_RESULT_ID_CACHE) {
    const removed = REALTIME_PUSHED_RESULT_ORDER.shift();
    if (removed) {
      REALTIME_PUSHED_RESULT_IDS.delete(removed);
    }
  }
  return true;
};

const sendRealtimeMessage = (client: RealtimeClient, message: RealtimeMessage) => {
  if (!SESSIONS.has(client.token)) {
    REALTIME_CLIENTS.delete(client.id);
    return;
  }

  try {
    client.send(message);
  } catch {
    REALTIME_CLIENTS.delete(client.id);
  }
};

const forEachRealtimeClient = (cb: (client: RealtimeClient) => void) => {
  REALTIME_CLIENTS.forEach((client) => cb(client));
};

const sendRealtimeToUser = (userId: string, message: RealtimeMessage) => {
  forEachRealtimeClient((client) => {
    if (client.userId !== userId) return;
    sendRealtimeMessage(client, message);
  });
};

const broadcastRealtime = (message: RealtimeMessage) => {
  forEachRealtimeClient((client) => sendRealtimeMessage(client, message));
};

const getRecentBetsForUser = (userId: string) => {
  const state = getOrCreateUserState(userId);
  return state.bets.filter((bet) => bet.gameId === ROULETTE_GAME_ID).slice(0, 5).map(toPublicBet);
};

const buildRealtimeSnapshot = (userId: string): Extract<RealtimeMessage, { type: 'snapshot' }> => ({
  type: 'snapshot',
  payload: {
    activeRound: activeRound ? toRoundView(activeRound) : null,
    recentResults: ROUND_RESULTS.filter((result) => result.gameId === ROULETTE_GAME_ID).slice(0, MAX_RESULT_HISTORY),
    myBets: getRecentBetsForUser(userId),
    wallet: getOrCreateUserState(userId).wallet,
  },
});

const broadcastRoundUpdate = () => {
  broadcastRealtime({
    type: 'round:update',
    payload: activeRound ? toRoundView(activeRound) : null,
  });
};

const emitRoundResultRealtime = (result: GameResult) => {
  if (!trackPushedRoundResult(result.roundId)) return;
  broadcastRealtime({
    type: 'round:result',
    payload: result,
  });
};

const emitWalletUpdate = (userId: string) => {
  sendRealtimeToUser(userId, {
    type: 'wallet:update',
    payload: getOrCreateUserState(userId).wallet,
  });
};

const emitBetUpdate = (userId: string, bet: BetRecord) => {
  sendRealtimeToUser(userId, {
    type: 'bet:update',
    payload: toPublicBet(bet),
  });
};

const invalidateRealtimeTokenClients = (token: string) => {
  forEachRealtimeClient((client) => {
    if (client.token !== token) return;
    sendRealtimeMessage(client, {
      type: 'session:expired',
      payload: { reason: 'Session ended. Please login again.' },
    });
    REALTIME_CLIENTS.delete(client.id);
  });
};

export const registerRealtimeClient = (token: string, send: (message: RealtimeMessage) => void) => {
  const normalizedToken = token.trim();
  if (!normalizedToken) return null;

  const session = SESSIONS.get(normalizedToken);
  if (!session) return null;

  const clientId = `rt-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  REALTIME_CLIENTS.set(clientId, {
    id: clientId,
    token: normalizedToken,
    userId: session.user.id,
    send,
  });

  send(buildRealtimeSnapshot(session.user.id));

  return () => {
    REALTIME_CLIENTS.delete(clientId);
  };
};

const getSessionUser = (context: ResolverContext) => {
  const token = context?.token?.trim();
  if (!token) return null;
  return SESSIONS.get(token)?.user ?? null;
};

const requireAuth = (context: ResolverContext) => {
  const user = getSessionUser(context);
  if (!user) {
    throw new Error('Please login to continue');
  }
  return user;
};

const activeUserCount = () => new Set(Array.from(SESSIONS.values(), (session) => session.user.id)).size;

const currentGameStatus = () => (activeRound ? 'ACTIVE' : activeUserCount() > 0 ? 'ACTIVE' : 'WAITING');

const createRound = (): GameRoundState => {
  const now = Date.now();
  return {
    id: `round-${now}`,
    gameId: ROULETTE_GAME_ID,
    status: 'BETTING',
    startsAt: new Date(now).toISOString(),
    endsAt: new Date(now + ROUND_DURATION_MS).toISOString(),
    totalBets: 0,
    pot: 0,
  };
};

const ensureEngineRunning = () => {
  if (engineInterval) return;
  engineInterval = setInterval(() => {
    void runEngineTick();
  }, 1000);
};

const maybeStopEngine = () => {
  if (activeUserCount() > 0) return;
  if (activeRound) return;
  if (!engineInterval) return;
  clearInterval(engineInterval);
  engineInterval = null;
};

const maybeStartRound = () => {
  if (activeUserCount() === 0) {
    maybeStopEngine();
    return;
  }

  ensureEngineRunning();

  if (activeRound) {
    return;
  }
  activeRound = createRound();
  broadcastRoundUpdate();
};

const evaluateRouletteBet = (
  betType: BetType,
  rawValue: string,
  winningNumber: number,
  winningColor: RouletteColor,
): { betValue: string; multiplier: number; isWin: boolean } => {
  const betValue = String(rawValue || '').trim().toUpperCase();

  if (betType === 'NUMBER') {
    const selected = Number(betValue);
    if (!Number.isInteger(selected) || selected < 0 || selected > 36) {
      throw new Error('For NUMBER bets, pick an integer from 0 to 36');
    }

    return { betValue: String(selected), multiplier: 36, isWin: selected === winningNumber };
  }

  if (betType === 'COLOR') {
    if (!['RED', 'BLACK', 'GREEN'].includes(betValue)) {
      throw new Error('For COLOR bets, choose RED, BLACK, or GREEN');
    }
    return { betValue, multiplier: betValue === 'GREEN' ? 36 : 2, isWin: betValue === winningColor };
  }

  if (betType === 'ODD_EVEN') {
    if (!['ODD', 'EVEN'].includes(betValue)) {
      throw new Error('For ODD_EVEN bets, choose ODD or EVEN');
    }
    const isEvenResult = winningNumber !== 0 && winningNumber % 2 === 0;
    const isWin = winningNumber !== 0 && ((betValue === 'EVEN' && isEvenResult) || (betValue === 'ODD' && !isEvenResult));
    return { betValue, multiplier: 2, isWin };
  }

  throw new Error('Unsupported bet type');
};

const kafka = new Kafka({
  clientId: 'api-gateway',
  brokers: [KAFKA_BROKER],
});

const publishKafkaEvent = async (topic: string, payload: unknown) => {
  if (!kafkaProducer) return;
  try {
    await kafkaProducer.send({
      topic,
      messages: [{ value: JSON.stringify(payload) }],
    });
  } catch (error) {
    console.error(`Kafka publish failed for topic ${topic}:`, error);
  }
};

const settleActiveRound = async () => {
  if (!activeRound || activeRound.status !== 'BETTING') {
    return;
  }

  const round = { ...activeRound };
  activeRound = { ...activeRound, status: 'SETTLING' };
  broadcastRoundUpdate();

  const winningNumber = Math.floor(Math.random() * 37);
  const winningColor = rouletteColor(winningNumber);
  const resolvedAt = new Date().toISOString();
  const roundBets = PENDING_ROUND_BETS.get(round.id) ?? [];

  let totalWagered = 0;
  let totalPayout = 0;
  const affectedUsers = new Set<string>();

  for (const bet of roundBets) {
    totalWagered = roundToCents(totalWagered + bet.amount);
    const decision = evaluateRouletteBet(bet.betType, bet.betValue, winningNumber, winningColor);
    const payout = decision.isWin ? roundToCents(bet.amount * decision.multiplier) : 0;
    const netChange = roundToCents(payout - bet.amount);

    bet.status = decision.isWin ? 'WON' : 'LOST';
    bet.payout = payout;
    bet.netChange = netChange;
    bet.multiplier = decision.multiplier;
    bet.winningNumber = winningNumber;
    bet.winningColor = winningColor;
    bet.resolvedAt = resolvedAt;
    bet.betValue = decision.betValue;
    affectedUsers.add(bet.userId);

    if (payout > 0) {
      const userState = getOrCreateUserState(bet.userId);
      userState.wallet.amount = roundToCents(userState.wallet.amount + payout);
      totalPayout = roundToCents(totalPayout + payout);
      addUserTransaction(userState, payout, 'PAYOUT', `Round ${round.id} payout`, resolvedAt);
    }

    emitBetUpdate(bet.userId, bet);
  }

  affectedUsers.forEach((userId) => emitWalletUpdate(userId));

  const result: GameResult = {
    roundId: round.id,
    gameId: round.gameId,
    winningNumber,
    winningColor,
    resolvedAt,
    totalBets: roundBets.length,
    totalWagered,
    totalPayout,
  };

  upsertRoundResult(result);
  PENDING_ROUND_BETS.delete(round.id);

  await publishKafkaEvent(KAFKA_TOPICS.roundResolved, result);
  if (!kafkaInitialized) {
    emitRoundResultRealtime(result);
  }

  activeRound = null;
  broadcastRoundUpdate();
  maybeStartRound();
};

const runEngineTick = async () => {
  if (activeRound && activeUserCount() === 0 && activeRound.totalBets === 0) {
    activeRound = null;
    broadcastRoundUpdate();
    maybeStopEngine();
    return;
  }

  if (!activeRound) {
    maybeStartRound();
    if (!activeRound) {
      maybeStopEngine();
    }
    return;
  }

  const roundEndMs = Date.parse(activeRound.endsAt);
  if (activeRound.status === 'BETTING' && Date.now() >= roundEndMs) {
    await settleActiveRound();
  }
};

const initializeKafka = async () => {
  if (kafkaInitialized) return;

  try {
    kafkaProducer = kafka.producer();
    await kafkaProducer.connect();

    kafkaConsumer = kafka.consumer({ groupId: KAFKA_GROUP_ID });
    await kafkaConsumer.connect();
    await kafkaConsumer.subscribe({ topic: KAFKA_TOPICS.roundResolved, fromBeginning: false });
    await kafkaConsumer.run({
      eachMessage: async ({ message }) => {
        const payload = parseEvent<GameResult>(message.value);
        if (!payload) return;
        if (payload.gameId !== ROULETTE_GAME_ID) return;
        if (!payload.roundId || payload.winningNumber === undefined || !payload.resolvedAt) return;
        upsertRoundResult(payload);
        emitRoundResultRealtime(payload);
      },
    });

    kafkaInitialized = true;
    console.log(`Kafka connected on ${KAFKA_BROKER}`);
  } catch (error) {
    console.error('Kafka initialization failed. Continuing without broker integration.', error);
  }
};

export const initializeRouletteSystem = async () => {
  if (rouletteSystemStarted) return;
  rouletteSystemStarted = true;

  await initializeKafka();
  if (activeUserCount() > 0) {
    maybeStartRound();
  }
};

const bootstrapUserStates = () => {
  Object.values(MOCK_USERS).forEach((user) => {
    getOrCreateUserState(user.id);
  });
};
bootstrapUserStates();

export const resolvers = {
  me: (_args: any, context: ResolverContext) => getSessionUser(context),
  games: (_args: any, context: ResolverContext) => {
    requireAuth(context);
    return MOCK_GAMES.map((game) => ({ ...game, status: currentGameStatus() }));
  },
  game: (args: any, context: ResolverContext) => {
    requireAuth(context);
    const game = MOCK_GAMES.find((entry) => entry.id === args?.id);
    return game ? { ...game, status: currentGameStatus() } : null;
  },
  walletBalance: (_args: any, context: ResolverContext) => {
    const user = requireAuth(context);
    return getOrCreateUserState(user.id).wallet;
  },
  transactions: (args: any, context: ResolverContext) => {
    const user = requireAuth(context);
    const state = getOrCreateUserState(user.id);
    const { start, safeSize } = toPageWindow(args?.page, args?.size);
    return state.transactions.slice(start, start + safeSize);
  },
  betHistory: (args: any, context: ResolverContext) => {
    const user = requireAuth(context);
    const state = getOrCreateUserState(user.id);
    const { start, safeSize } = toPageWindow(args?.page, args?.size);
    const gameId = String(args?.gameId || '');
    return state.bets.filter((bet) => bet.gameId === gameId).slice(start, start + safeSize);
  },
  activeGameRound: (args: any, context: ResolverContext) => {
    requireAuth(context);
    const gameId = String(args?.gameId || '');
    if (gameId !== ROULETTE_GAME_ID) return null;
    maybeStartRound();
    if (!activeRound) return null;
    return toRoundView(activeRound);
  },
  recentGameResults: (args: any, context: ResolverContext) => {
    requireAuth(context);
    const gameId = String(args?.gameId || '');
    const limit = Math.max(1, Math.min(25, Number(args?.limit) || MAX_RESULT_HISTORY));
    return ROUND_RESULTS.filter((result) => result.gameId === gameId).slice(0, limit);
  },
  rouletteSnapshot: (args: any, context: ResolverContext) => {
    const user = requireAuth(context);
    const gameId = String(args?.gameId || '');
    if (gameId !== ROULETTE_GAME_ID) {
      throw new Error('Game not found');
    }

    maybeStartRound();
    const state = getOrCreateUserState(user.id);
    return {
      activeRound: activeRound ? toRoundView(activeRound) : null,
      recentResults: ROUND_RESULTS.filter((result) => result.gameId === gameId).slice(0, MAX_RESULT_HISTORY),
      myBets: state.bets.filter((bet) => bet.gameId === gameId).slice(0, 5).map(toPublicBet),
      wallet: state.wallet,
    };
  },
  login: (args: any) => {
    const email = normalizeEmail(args?.email);
    const password = typeof args?.password === 'string' ? args.password.trim() : '';

    const credential = MOCK_CREDENTIALS[email];
    if (!credential || credential.password !== password) {
      throw new Error('Invalid credentials');
    }

    const token = createToken();
    const session: Session = {
      token,
      user: credential.user,
      createdAt: new Date().toISOString(),
    };
    SESSIONS.set(token, session);
    getOrCreateUserState(credential.user.id);
    maybeStartRound();

    return {
      accessToken: token,
      user: credential.user,
    };
  },
  logout: (_args: any, context: ResolverContext) => {
    const token = context?.token?.trim();
    if (token) {
      SESSIONS.delete(token);
      invalidateRealtimeTokenClients(token);
    }
    if (activeUserCount() === 0 && activeRound && activeRound.totalBets === 0) {
      activeRound = null;
      broadcastRoundUpdate();
    }
    maybeStopEngine();
    return true;
  },
  placeBet: async (args: any, context: ResolverContext) => {
    const user = requireAuth(context);
    maybeStartRound();

    const gameId = String(args?.gameId || '');
    if (gameId !== ROULETTE_GAME_ID) {
      throw new Error('Game not found');
    }

    if (!activeRound || activeRound.status !== 'BETTING') {
      throw new Error('Round is not accepting bets right now');
    }

    const game = MOCK_GAMES[0];
    const amount = Number(args?.amount);
    const betType = String(args?.betType || '').toUpperCase() as BetType;
    const rawBetValue = String(args?.betValue || '');

    if (!Number.isFinite(amount) || amount < game.minBet || amount > game.maxBet) {
      throw new Error(`Bet amount must be between ${game.minBet} and ${game.maxBet}`);
    }

    const wager = roundToCents(amount);
    const userState = getOrCreateUserState(user.id);
    if (userState.wallet.amount < wager) {
      throw new Error('Insufficient funds');
    }

    const normalizedBet = evaluateRouletteBet(betType, rawBetValue, 0, 'GREEN');
    const placedAt = new Date().toISOString();
    const bet: BetRecord = {
      id: `bet-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      userId: user.id,
      roundId: activeRound.id,
      amount: wager,
      status: 'PENDING',
      payout: null,
      netChange: null,
      betType,
      betValue: normalizedBet.betValue,
      winningNumber: null,
      winningColor: null,
      multiplier: null,
      createdAt: placedAt,
      resolvedAt: null,
      gameId,
    };

    userState.wallet.amount = roundToCents(userState.wallet.amount - wager);
    addUserTransaction(userState, -wager, 'BET', `Round ${activeRound.id} ${betType} ${normalizedBet.betValue}`, placedAt);
    userState.bets.unshift(bet);

    const roundBets = PENDING_ROUND_BETS.get(activeRound.id) ?? [];
    roundBets.push(bet);
    PENDING_ROUND_BETS.set(activeRound.id, roundBets);

    activeRound.totalBets += 1;
    activeRound.pot = roundToCents(activeRound.pot + wager);
    emitWalletUpdate(user.id);
    emitBetUpdate(user.id, bet);
    broadcastRoundUpdate();

    await publishKafkaEvent(KAFKA_TOPICS.betPlaced, {
      betId: bet.id,
      roundId: bet.roundId,
      userId: user.id,
      gameId,
      amount: bet.amount,
      betType: bet.betType,
      betValue: bet.betValue,
      createdAt: bet.createdAt,
    });

    return bet;
  },
  creditWallet: (args: any, context: ResolverContext) => {
    const user = requireAuth(context);
    const state = getOrCreateUserState(user.id);
    const amount = Number(args?.amount);
    const reason = String(args?.reason || 'Manual top-up').trim();

    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error('Credit amount must be greater than zero');
    }

    state.wallet.amount = roundToCents(state.wallet.amount + amount);
    addUserTransaction(state, amount, 'CREDIT', reason);
    emitWalletUpdate(user.id);
    return state.wallet;
  },
};
