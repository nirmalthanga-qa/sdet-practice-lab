type LearningTrackCardProps = {
  number: string;
  title: string;
  description: string;
};

export default function LearningTrackCard({
  number,
  title,
  description,
}: LearningTrackCardProps) {
  return (
    <article className="track-card">
      <span className="track-number" aria-hidden="true">
        {number}
      </span>

      <h3>{title}</h3>
      <p>{description}</p>
      <span className="track-status">Planned</span>
    </article>
  );
}