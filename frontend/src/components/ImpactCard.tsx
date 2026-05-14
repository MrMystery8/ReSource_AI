import { motion } from 'framer-motion';
import type { ImpactCardOutput } from '@resource-ai/shared';
import { Award, Zap, Shield, Lightbulb, Wrench, Leaf, AlertTriangle, Target } from 'lucide-react';

export interface ImpactCardProps {
  data: ImpactCardOutput;
}

interface FieldDisplay {
  key: keyof ImpactCardOutput;
  label: string;
  icon: React.ReactNode;
}

const FIELD_DISPLAYS: FieldDisplay[] = [
  { key: 'deviceName', label: 'Device', icon: <Zap className="w-4 h-4" /> },
  { key: 'riskLevel', label: 'Risk Level', icon: <Shield className="w-4 h-4" /> },
  { key: 'salvageScore', label: 'Salvage Score', icon: <Target className="w-4 h-4" /> },
  { key: 'topReusablePart', label: 'Top Reusable Part', icon: <Wrench className="w-4 h-4" /> },
  { key: 'bestSecondLifeIdea', label: 'Best Second Life', icon: <Lightbulb className="w-4 h-4" /> },
  { key: 'skillLevelRequired', label: 'Skill Required', icon: <Award className="w-4 h-4" /> },
  { key: 'safetyWarning', label: 'Safety Warning', icon: <AlertTriangle className="w-4 h-4" /> },
  { key: 'recommendedAction', label: 'Recommended Action', icon: <Target className="w-4 h-4" /> },
  { key: 'environmentalImpactNote', label: 'Environmental Impact', icon: <Leaf className="w-4 h-4" /> },
  { key: 'recoveryDifficulty', label: 'Recovery Difficulty', icon: <Wrench className="w-4 h-4" /> },
  { key: 'overallVerdict', label: 'Overall Verdict', icon: <Award className="w-4 h-4" /> },
];

export function ImpactCard({ data }: ImpactCardProps) {
  return (
    <motion.div
      className="relative overflow-hidden rounded-2xl"
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
    >
      {/* Gradient border effect */}
      <div className="absolute inset-0 bg-primary-50 rounded-2xl" />
      <div className="relative m-[1px] rounded-2xl bg-surface-card  p-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-primary-600 flex items-center justify-center">
            <Award className="w-5 h-5 text-text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-text-primary">ReSource Impact Card</h3>
            <p className="text-xs text-text-muted">Complete device assessment summary</p>
          </div>
        </div>

        {/* Fields Grid */}
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {FIELD_DISPLAYS.map(({ key, label, icon }, index) => (
            <motion.div
              key={key}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.04 }}
              className="flex items-start gap-3 p-3 rounded-xl bg-stone-100 border border-border-subtle hover:border-primary-500/30 transition-colors"
            >
              <span className="text-primary-400 mt-0.5 shrink-0">{icon}</span>
              <div className="min-w-0">
                <dt className="text-xs font-medium text-text-muted mb-0.5">{label}</dt>
                <dd className="text-sm text-text-primary leading-snug">{data[key]}</dd>
              </div>
            </motion.div>
          ))}
        </dl>
      </div>
    </motion.div>
  );
}

export default ImpactCard;
