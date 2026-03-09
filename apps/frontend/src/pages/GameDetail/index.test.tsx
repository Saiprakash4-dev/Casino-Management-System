import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useApolloClient, useMutation } from '@apollo/client';
import { connectRealtime } from '../../services/realtime';
import {
  ACTIVE_GAME_ROUND_QUERY,
  BET_HISTORY_QUERY,
  RECENT_GAME_RESULTS_QUERY,
  ROULETTE_SNAPSHOT_QUERY,
  WALLET_BALANCE_QUERY,
} from '../../graphql/queries';
import { GameDetailPage } from './index';

jest.mock('@apollo/client', () => {
  const actual = jest.requireActual('@apollo/client');
  return {
    ...actual,
    useApolloClient: jest.fn(),
    useMutation: jest.fn(),
  };
});

const mockNotify = jest.fn();
jest.mock('../../app/providers/RealtimeProvider', () => ({
  useRealtime: () => ({ notify: mockNotify }),
}));

jest.mock('../../services/realtime', () => ({
  connectRealtime: jest.fn(),
}));

const mockedUseApolloClient = useApolloClient as jest.Mock;
const mockedUseMutation = useMutation as jest.Mock;
const mockedConnectRealtime = connectRealtime as jest.MockedFunction<typeof connectRealtime>;

describe('GameDetailPage', () => {
  let queryMock: jest.Mock;
  let placeBetMock: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    localStorage.setItem('token', 'test-token');

    queryMock = jest.fn();
    placeBetMock = jest.fn();

    mockedUseApolloClient.mockReturnValue({ query: queryMock });
    mockedUseMutation.mockReturnValue([placeBetMock, { loading: false }]);
    mockedConnectRealtime.mockImplementation(() => jest.fn());
  });

  it('falls back to legacy GraphQL queries when rouletteSnapshot is unavailable', async () => {
    const endsAt = new Date(Date.now() + 45000).toISOString();

    queryMock.mockImplementation(({ query }: { query: unknown }) => {
      if (query === ROULETTE_SNAPSHOT_QUERY) {
        return Promise.reject(new Error('Cannot query field "rouletteSnapshot"'));
      }
      if (query === WALLET_BALANCE_QUERY) {
        return Promise.resolve({ data: { walletBalance: { id: 'wallet-1', amount: 4200, currency: 'USD' } } });
      }
      if (query === ACTIVE_GAME_ROUND_QUERY) {
        return Promise.resolve({
          data: {
            activeGameRound: {
              id: 'round-1',
              gameId: 'roulette-1',
              status: 'BETTING',
              startsAt: new Date().toISOString(),
              endsAt,
              timeRemainingSec: 45,
              totalBets: 3,
              pot: 180,
            },
          },
        });
      }
      if (query === RECENT_GAME_RESULTS_QUERY) {
        return Promise.resolve({ data: { recentGameResults: [] } });
      }
      if (query === BET_HISTORY_QUERY) {
        return Promise.resolve({ data: { betHistory: [] } });
      }
      return Promise.resolve({ data: {} });
    });

    render(<GameDetailPage />);

    await waitFor(() => {
      expect(screen.getByText('$4,200.00')).toBeInTheDocument();
    });
    expect(screen.getByText(/Status: BETTING/)).toBeInTheDocument();
    expect(screen.getByText(/Next spin in \d+s/)).toBeInTheDocument();
  });

  it('shows waiting state and disables placing bet when no active round exists', async () => {
    queryMock.mockResolvedValue({
      data: {
        rouletteSnapshot: {
          wallet: { id: 'wallet-1', amount: 5000, currency: 'USD' },
          activeRound: null,
          recentResults: [],
          myBets: [],
        },
      },
    });

    render(<GameDetailPage />);

    await waitFor(() => {
      expect(screen.getByText('Waiting for logged-in players to start the next round.')).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: 'Join Current Round' })).toBeDisabled();
  });

  it('validates stake input before sending placeBet mutation', async () => {
    const endsAt = new Date(Date.now() + 60000).toISOString();
    queryMock.mockResolvedValue({
      data: {
        rouletteSnapshot: {
          wallet: { id: 'wallet-1', amount: 5000, currency: 'USD' },
          activeRound: {
            id: 'round-2',
            gameId: 'roulette-1',
            status: 'BETTING',
            startsAt: new Date().toISOString(),
            endsAt,
            timeRemainingSec: 60,
            totalBets: 0,
            pot: 0,
          },
          recentResults: [],
          myBets: [],
        },
      },
    });

    render(<GameDetailPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Join Current Round' })).toBeEnabled();
    });

    fireEvent.change(screen.getByLabelText('Stake'), { target: { value: '0' } });
    fireEvent.click(screen.getByRole('button', { name: 'Join Current Round' }));

    expect(screen.getByText('Enter a valid stake amount')).toBeInTheDocument();
    expect(placeBetMock).not.toHaveBeenCalled();
  });
});
