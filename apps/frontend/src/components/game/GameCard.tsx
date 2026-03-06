type Props = { title: string; subtitle: string };

export function GameCard({ title, subtitle }: Props) {
  return (
    <article className="card">
      <h3>{title}</h3>
      <p>{subtitle}</p>
      <button className="btn">Enter</button>
    </article>
  );
}
