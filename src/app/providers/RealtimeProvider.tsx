import { useApolloClient } from '@apollo/client';
import { useEffect } from 'react';
import { BET_HISTORY_QUERY, WALLET_BALANCE_QUERY } from '../../graphql/queries';
import { useAuth } from './AuthProvider';
import { REALTIME_URL } from '../../utils/constants';
import { useUIStore } from '../../state/uiStore';

export const RealtimeProvider = ({ children }: { children: React.ReactNode }) => {
  const client = useApolloClient();
  const { user } = useAuth();
  const pushToast = useUIStore((s) => s.pushToast);

  useEffect(() => {
    if (!user) return;
    const source = new EventSource(`${REALTIME_URL}?userId=${user.id}`, { withCredentials: true });

    source.onmessage = (raw) => {
      const event = JSON.parse(raw.data) as { type: string; payload: Record<string, unknown> };
      if (event.type === 'walletUpdated') {
        client.writeQuery({
          query: WALLET_BALANCE_QUERY,
          data: { walletBalance: event.payload.walletBalance },
        });
      }
      if (event.type === 'betResolved') {
        pushToast({ message: `Bet ${String(event.payload.betId)} resolved`, kind: 'success' });
        const gameId = String(event.payload.gameId ?? '');
        if (gameId) {
          client.refetchQueries({ include: [BET_HISTORY_QUERY], updateCache: () => undefined });
        }
      }
      if (event.type === 'notificationReceived') {
        pushToast({ message: String(event.payload.message ?? 'Notification received') });
      }
    };

    source.onerror = () => {
      pushToast({ message: 'Realtime connection issue', kind: 'error' });
    };

    return () => source.close();
  }, [client, pushToast, user]);

  return <>{children}</>;
};
