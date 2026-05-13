import './ResultsView.css';

export interface StageCardProps {
  stageName: string;
  data: Record<string, unknown>;
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '—';
  }
  if (Array.isArray(value)) {
    return value
      .map((item) =>
        typeof item === 'object' && item !== null
          ? Object.values(item).join(' — ')
          : String(item)
      )
      .join(', ');
  }
  if (typeof value === 'object') {
    return Object.entries(value)
      .map(([k, v]) => `${formatKey(k)}: ${formatValue(v)}`)
      .join('; ');
  }
  return String(value);
}

function formatKey(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (s) => s.toUpperCase())
    .trim();
}

export function StageCard({ stageName, data }: StageCardProps) {
  const entries = Object.entries(data);

  return (
    <div className="stage-card">
      <h3 className="stage-card__title">{stageName}</h3>
      <dl className="stage-card__content">
        {entries.map(([key, value]) => (
          <div className="stage-card__item" key={key}>
            <dt className="stage-card__label">{formatKey(key)}</dt>
            <dd className="stage-card__value">{formatValue(value)}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export default StageCard;
