import { Link } from 'react-router-dom';
import { GameCard } from '../../components/game/GameCard';

const games = [
  { id: 'blackjack', name: 'Golden Blackjack', rtp: '98.7%' },
  { id: 'roulette', name: 'Royal Roulette', rtp: '97.9%' },
  { id: 'slots', name: 'Diamond Slots', rtp: '96.2%' }
];

export function LobbyPage() {
  return (
    <main className="container">
      <section className="hero">
        <h1>Golden Hearts Casino Lobby</h1>
        <p>Live tables, instant wallet sync, and event-driven payouts in one dashboard.</p>
      </section>
      <section className="grid">
        {games.map((game) => (
          <Link to={`/game/${game.id}`} key={game.id}>
            <GameCard title={game.name} subtitle={`RTP ${game.rtp}`} />
          </Link>
        ))}
      </section>
    </main>
  );
}
