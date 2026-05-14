import { motion } from 'framer-motion';
import type { ReusablePartsMapOutput, PartVerdict } from '@resource-ai/shared';
import { Wrench } from 'lucide-react';

export interface PartsMapTableProps {
  data: ReusablePartsMapOutput;
}

const VERDICT_CONFIG: Record<PartVerdict, { bg: string; text: string; border: string }> = {
  Salvage: { bg: 'bg-success-50', text: 'text-success-500', border: 'border-success-100' },
  Conditional: { bg: 'bg-warning-50', text: 'text-warning-500', border: 'border-warning-100' },
  'Do Not Access': { bg: 'bg-danger-50', text: 'text-danger-500', border: 'border-danger-100' },
};

export function PartsMapTable({ data }: PartsMapTableProps) {
  return (
    <div className="card card-hover p-6 space-y-4">
      <div className="flex items-center gap-2">
        <Wrench className="w-5 h-5 text-primary-400" />
        <h3 className="text-lg font-semibold text-text-primary">Reusable Parts Map</h3>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border-subtle">
        <table className="w-full text-sm">
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
                  className="hover:bg-stone-100 transition-colors"
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
