import { useQuery } from '@apollo/client';
import { GameCard } from '../../components/game/GameCard';
import { PageShell } from '../../components/layout/PageShell';
import { Loader } from '../../components/common/Loader';
import { ErrorState } from '../../components/common/ErrorState';
import { GAMES_QUERY, WALLET_BALANCE_QUERY } from '../../../graphql/queries';
import { BalanceWidget } from '../../components/wallet/BalanceWidget';

export const LobbyPage = () => {
  const games = useQuery(GAMES_QUERY);
  const wallet = useQuery(WALLET_BALANCE_QUERY);

  if (games.loading || wallet.loading) return <PageShell><Loader /></PageShell>;
  if (games.error || wallet.error) return <PageShell><ErrorState message="Failed to load lobby" /></PageShell>;

  return (
    <PageShell>
      <h2>Lobby</h2>
      <BalanceWidget amount={wallet.data.walletBalance.amount} />
      <section className="grid grid-3">
        {games.data.games.map((game: any) => <GameCard key={game.id} game={game} />)}
      </section>
    </PageShell>
  );
};
