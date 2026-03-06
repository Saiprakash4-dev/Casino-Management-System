type BetType = 'NUMBER' | 'COLOR' | 'ODD_EVEN';
type RouletteColor = 'RED' | 'BLACK' | 'GREEN';

type MockUser = { id: string; email: string; roles: string[] };
type Game = { id: string; name: string; description: string; minBet: number; maxBet: number; status: string };
type Wallet = { id: string; amount: number; currency: string };
type Transaction = { id: string; amount: number; type: string; reason: string; createdAt: string };
type BetRecord = {
  id: string;
  amount: number;
  status: 'WON' | 'LOST';
  payout: number;
  netChange: number;
  betType: BetType;
  betValue: string;
  winningNumber: number;
  winningColor: RouletteColor;
  multiplier: number;
  createdAt: string;
  gameId: string;
};

const MOCK_USERS: Record<'user1' | 'admin', MockUser> = {
  user1: { id: 'user-1', email: 'player@casino.dev', roles: ['USER'] },
  admin: { id: 'admin-1', email: 'admin@casino.dev', roles: ['ADMIN', 'USER'] },
};

const MOCK_CREDENTIALS: Record<string, { user: MockUser; password: string }> = {
  'player@casino.dev': { user: MOCK_USERS.user1, password: 'password' },
  'admin@casino.dev': { user: MOCK_USERS.admin, password: 'password' },
};

const ROULETTE_GAME_ID = 'roulette-1';

const MOCK_GAMES: Game[] = [
  {
    id: ROULETTE_GAME_ID,
    name: 'Russian Roulette',
    description: 'Single-zero roulette with live spin resolution',
    minBet: 10,
    maxBet: 1000,
    status: 'ACTIVE',
  },
];

const MOCK_WALLET: Wallet = { id: 'wallet-1', amount: 5000, currency: 'USD' };
const MOCK_TRANSACTIONS: Transaction[] = [
  {
    id: 'txn-boot-1',
    amount: 5000,
    type: 'CREDIT',
    reason: 'Starting demo bankroll',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
];
const MOCK_BET_HISTORY: BetRecord[] = [];

const RED_NUMBERS = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);

let currentUser: MockUser | null = null;
let walletBalance: Wallet = { ...MOCK_WALLET };

const normalizeEmail = (value: unknown) => {
  if (typeof value !== 'string') return '';
  const cleaned = value.trim().toLowerCase();
  return cleaned.endsWith('@') ? `${cleaned}casino.dev` : cleaned;
};

const requireAuth = () => {
  if (!currentUser) {
    throw new Error('Please login to continue');
  }
};

const roundToCents = (value: number) => Math.round(value * 100) / 100;

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

const addTransaction = (amount: number, type: string, reason: string, createdAt = new Date().toISOString()) => {
  MOCK_TRANSACTIONS.unshift({
    id: `txn-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
    amount: roundToCents(amount),
    type,
    reason,
    createdAt,
  });
};

const evaluateRouletteBet = (
  rawType: unknown,
  rawValue: unknown,
  winningNumber: number,
  winningColor: RouletteColor,
): { betType: BetType; betValue: string; multiplier: number; isWin: boolean } => {
  const betType = String(rawType || '').toUpperCase() as BetType;
  const betValue = String(rawValue || '').trim().toUpperCase();

  if (betType === 'NUMBER') {
    const selected = Number(betValue);
    if (!Number.isInteger(selected) || selected < 0 || selected > 36) {
      throw new Error('For NUMBER bets, pick an integer from 0 to 36');
    }

    return {
      betType,
      betValue: String(selected),
      multiplier: 36,
      isWin: selected === winningNumber,
    };
  }

  if (betType === 'COLOR') {
    if (!['RED', 'BLACK', 'GREEN'].includes(betValue)) {
      throw new Error('For COLOR bets, choose RED, BLACK, or GREEN');
    }

    const multiplier = betValue === 'GREEN' ? 36 : 2;
    return {
      betType,
      betValue,
      multiplier,
      isWin: betValue === winningColor,
    };
  }

  if (betType === 'ODD_EVEN') {
    if (!['ODD', 'EVEN'].includes(betValue)) {
      throw new Error('For ODD_EVEN bets, choose ODD or EVEN');
    }

    const isEvenResult = winningNumber !== 0 && winningNumber % 2 === 0;
    const isWin = winningNumber !== 0 && ((betValue === 'EVEN' && isEvenResult) || (betValue === 'ODD' && !isEvenResult));

    return {
      betType,
      betValue,
      multiplier: 2,
      isWin,
    };
  }

  throw new Error('Unsupported bet type');
};

export const resolvers = {
  me: () => currentUser,
  games: () => MOCK_GAMES,
  game: (args: any) => MOCK_GAMES.find((g) => g.id === args?.id) || null,
  walletBalance: () => {
    requireAuth();
    return walletBalance;
  },
  transactions: (args: any) => {
    requireAuth();
    const { start, safeSize } = toPageWindow(args?.page, args?.size);
    return MOCK_TRANSACTIONS.slice(start, start + safeSize);
  },
  betHistory: (args: any) => {
    requireAuth();
    const { start, safeSize } = toPageWindow(args?.page, args?.size);
    const gameId = String(args?.gameId || '');
    return MOCK_BET_HISTORY.filter((b) => b.gameId === gameId).slice(start, start + safeSize);
  },
  login: (args: any) => {
    const email = normalizeEmail(args?.email);
    const password = typeof args?.password === 'string' ? args.password.trim() : '';

    const credential = MOCK_CREDENTIALS[email];
    if (credential && password === credential.password) {
      currentUser = credential.user;
      return {
        accessToken: `mock-token-${credential.user.id}-${Date.now()}`,
        user: credential.user,
      };
    }
    throw new Error('Invalid credentials');
  },
  logout: () => {
    currentUser = null;
    return true;
  },
  placeBet: (args: any) => {
    requireAuth();

    const gameId = String(args?.gameId || '');
    const amount = Number(args?.amount);
    const game = MOCK_GAMES.find((g) => g.id === gameId);

    if (!game) {
      throw new Error('Game not found');
    }

    if (!Number.isFinite(amount) || amount < game.minBet || amount > game.maxBet) {
      throw new Error(`Bet amount must be between ${game.minBet} and ${game.maxBet}`);
    }

    if (amount > walletBalance.amount) {
      throw new Error('Insufficient funds');
    }

    const wager = roundToCents(amount);
    const winningNumber = Math.floor(Math.random() * 37);
    const winningColor = rouletteColor(winningNumber);
    const decision = evaluateRouletteBet(args?.betType, args?.betValue, winningNumber, winningColor);
    const createdAt = new Date().toISOString();

    walletBalance.amount = roundToCents(walletBalance.amount - wager);

    const payout = decision.isWin ? roundToCents(wager * decision.multiplier) : 0;
    if (payout > 0) {
      walletBalance.amount = roundToCents(walletBalance.amount + payout);
    }

    const bet: BetRecord = {
      id: `bet-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      amount: wager,
      status: decision.isWin ? 'WON' : 'LOST',
      payout,
      netChange: roundToCents(payout - wager),
      betType: decision.betType,
      betValue: decision.betValue,
      winningNumber,
      winningColor,
      multiplier: decision.multiplier,
      createdAt,
      gameId,
    };

    MOCK_BET_HISTORY.unshift(bet);
    addTransaction(-wager, 'BET', `Roulette ${decision.betType} ${decision.betValue}`, createdAt);
    if (payout > 0) {
      addTransaction(payout, 'PAYOUT', `Win on ${winningNumber} ${winningColor}`, createdAt);
    }

    return bet;
  },
  creditWallet: (args: any) => {
    requireAuth();
    const amount = Number(args?.amount);
    const reason = String(args?.reason || 'Manual top-up').trim();

    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error('Credit amount must be greater than zero');
    }

    walletBalance.amount = roundToCents(walletBalance.amount + amount);
    addTransaction(amount, 'CREDIT', reason);
    return walletBalance;
  },
};
