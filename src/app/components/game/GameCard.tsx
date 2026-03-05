import { Link } from 'react-router-dom';

type Game = { id: string; name: string; minBet: number; maxBet: number; status: string };

export const GameCard = ({ game }: { game: Game }) => (
  <article className="card">
    <h3>{game.name}</h3>
    <p>{game.status}</p>
    <p>Limits: {game.minBet} - {game.maxBet}</p>
    <Link to={`/game/${game.id}`}>Play</Link>
  </article>
);
