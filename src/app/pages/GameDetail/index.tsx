import { useMutation, useQuery } from '@apollo/client';
import { useParams } from 'react-router-dom';
import { PLACE_BET_MUTATION } from '../../../graphql/mutations';
import { BET_HISTORY_QUERY, GAME_QUERY, WALLET_BALANCE_QUERY } from '../../../graphql/queries';
import { Loader } from '../../components/common/Loader';
import { PageShell } from '../../components/layout/PageShell';
import { BetSlip } from '../../components/game/BetSlip';
import { BetHistory } from '../../components/game/BetHistory';
import { useUIStore } from '../../../state/uiStore';

export const GameDetailPage = () => {
  const { gameId = '' } = useParams();
  const selectedBetAmount = useUIStore((s) => s.selectedBetAmount);
  const setSelectedBetAmount = useUIStore((s) => s.setSelectedBetAmount);
  const pushToast = useUIStore((s) => s.pushToast);
  const game = useQuery(GAME_QUERY, { variables: { gameId } });
  const history = useQuery(BET_HISTORY_QUERY, { variables: { gameId, page: 0, size: 10 } });
  useQuery(WALLET_BALANCE_QUERY);

  const [placeBet, placeBetState] = useMutation(PLACE_BET_MUTATION, {
    onCompleted: (data) => pushToast({ message: `Bet accepted: ${data.placeBet.id}` }),
    onError: () => pushToast({ message: 'Failed to place bet', kind: 'error' }),
  });

  if (game.loading || history.loading) return <PageShell><Loader /></PageShell>;
  const g = game.data.game;

  return (
    <PageShell>
      <h2>{g.name}</h2>
      <p>{g.description}</p>
      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <BetSlip
          minBet={g.minBet}
          maxBet={g.maxBet}
          loading={placeBetState.loading}
          defaultAmount={selectedBetAmount}
          onSubmit={(amount) => {
            setSelectedBetAmount(amount);
            placeBet({
              variables: { gameId, amount },
              optimisticResponse: { placeBet: { __typename: 'Bet', id: `tmp-${Date.now()}`, amount, status: 'PENDING', payout: 0, createdAt: new Date().toISOString(), gameId } },
            });
          }}
        />
        <BetHistory bets={history.data.betHistory} />
      </div>
    </PageShell>
  );
};
