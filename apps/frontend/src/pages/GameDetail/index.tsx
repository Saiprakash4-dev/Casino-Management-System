import { useParams } from 'react-router-dom';
import { BetSlip } from '../../components/game/BetSlip';

export function GameDetailPage() {
  const { id } = useParams();
  return (
    <main className="container">
      <h2>{id?.toUpperCase()} Table</h2>
      <div className="grid">
        <div className="card">
          <h3>Live Odds</h3>
          <p>Home 1.9 / Away 2.4 / Draw 3.3</p>
        </div>
        <BetSlip />
      </div>
    </main>
  );
}
