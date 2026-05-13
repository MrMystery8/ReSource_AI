import { motion } from 'framer-motion';

export interface StageCardProps {
  stageName?: string;
  data: Record<string, unknown>;
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '—';
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

export function StageCard({ data }: StageCardProps) {
  const entries = Object.entries(data).filter(
    ([key]) => key !== 'riskLevel'
  );

  return (
    <dl className="space-y-3">
      {entries.map(([key, value], index) => (
        <motion.div
          key={key}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: index * 0.03 }}
          className="flex flex-col sm:flex-row sm:gap-4 py-2 border-b border-border-subtle last:border-0"
        >
          <dt className="text-xs font-medium text-text-muted uppercase tracking-wide min-w-[160px] shrink-0 mb-0.5 sm:mb-0">
            {formatKey(key)}
          </dt>
          <dd className="text-sm text-text-primary leading-relaxed">
            {formatValue(value)}
          </dd>
        </motion.div>
      ))}
    </dl>
  );
}

export default StageCard;
