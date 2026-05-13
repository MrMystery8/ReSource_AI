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

const listVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const itemVariants = {
  hidden: { opacity: 0, x: -10 },
  visible: { opacity: 1, x: 0 },
};

export function StageCard({ data }: StageCardProps) {
  const entries = Object.entries(data).filter(
    ([key]) => key !== 'riskLevel'
  );

  return (
    <motion.dl
      className="space-y-3"
      variants={listVariants}
      initial="hidden"
      animate="visible"
    >
      {entries.map(([key, value]) => (
        <motion.div
          key={key}
          variants={itemVariants}
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
    </motion.dl>
  );
}

export default StageCard;
