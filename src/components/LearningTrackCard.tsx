type LearningTrackCardProps = {
  number: string;
  title: string;
  description: string;
  status?: 'Available' | 'Planned';
};

export default function LearningTrackCard({
  number,
  title,
  description,
  status = 'Planned',
}: LearningTrackCardProps) {
  return (
    <article className="track-card">
      <span className="track-number" aria-hidden="true">
        {number}
      </span>

      <h3>{title}</h3>
      <p>{description}</p>

      <span className="track-status">{status}</span>
    </article>
  );
}