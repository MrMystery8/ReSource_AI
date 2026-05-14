import { motion } from 'framer-motion';
import type { ReusablePartsMapOutput, PartVerdict } from '@resource-ai/shared';
import { Wrench } from 'lucide-react';

export interface PartsMapTableProps {
  data: ReusablePartsMapOutput;
}

const VERDICT_CONFIG: Record<PartVerdict, { bg: string; text: string; border: string }> = {
  Salvage: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30' },
  Conditional: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30' },
  'Do Not Access': { bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/30' },
};

export function PartsMapTable({ data }: PartsMapTableProps) {
  return (
    /*
     * w-full + min-w-0 prevent the card from stretching beyond the viewport
     * on narrow screens (Requirement 6.4, 9.2).
     */
    <div className="w-full min-w-0 p-6 space-y-4 rounded-xl bg-[var(--color-surface-card)] border border-[var(--color-border-default)] shadow-[var(--shadow-md)] hover:border-[var(--color-primary)]/30 transition-colors">
      <div className="flex items-center gap-2">
        <Wrench className="w-5 h-5 text-primary-400" />
        <h3 className="text-lg font-semibold text-text-primary">Reusable Parts Map</h3>
      </div>

      {/* overflow-x-auto scrolls the table horizontally within the card
          without causing the page to scroll (Requirement 9.3) */}
      <div className="overflow-x-auto rounded-lg border border-border-subtle">
        <table className="w-full text-sm" style={{ minWidth: '560px' }}>
          <thead>
            <tr className="bg-surface-elevated/80">
              <th className="px-4 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wide">Part</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wide">Presence</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wide">Value</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wide">Use</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wide">Skill</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wide">Safety</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wide">Verdict</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle">
            {data.parts.map((row, index) => {
              const verdictConfig = VERDICT_CONFIG[row.verdict];
              return (
                <motion.tr
                  key={index}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.04 }}
                  className="hover:bg-surface-elevated/40 transition-colors"
                >
                  <td className="px-4 py-3 font-medium text-text-primary">{row.partResource}</td>
                  <td className="px-4 py-3 text-text-secondary">{row.likelyPresence}</td>
                  <td className="px-4 py-3 text-text-secondary">{row.reuseValue}</td>
                  <td className="px-4 py-3 text-text-secondary">{row.possibleUse}</td>
                  <td className="px-4 py-3 text-text-secondary">{row.skillNeeded}</td>
                  <td className="px-4 py-3 text-text-secondary">{row.safetyConcern}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold border ${verdictConfig.bg} ${verdictConfig.text} ${verdictConfig.border}`}>
                      {row.verdict}
                    </span>
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default PartsMapTable;
