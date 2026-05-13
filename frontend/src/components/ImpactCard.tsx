import type { ImpactCardOutput } from '@resource-ai/shared';
import './ResultsView.css';

export interface ImpactCardProps {
  data: ImpactCardOutput;
}

const FIELD_LABELS: { key: keyof ImpactCardOutput; label: string }[] = [
  { key: 'deviceName', label: 'Device Name' },
  { key: 'riskLevel', label: 'Risk Level' },
  { key: 'salvageScore', label: 'Salvage Score' },
  { key: 'topReusablePart', label: 'Top Reusable Part' },
  { key: 'bestSecondLifeIdea', label: 'Best Second Life Idea' },
  { key: 'skillLevelRequired', label: 'Skill Level Required' },
  { key: 'safetyWarning', label: 'Safety Warning' },
  { key: 'recommendedAction', label: 'Recommended Action' },
  { key: 'environmentalImpactNote', label: 'Environmental Impact Note' },
  { key: 'recoveryDifficulty', label: 'Recovery Difficulty' },
  { key: 'overallVerdict', label: 'Overall Verdict' },
];

export function ImpactCard({ data }: ImpactCardProps) {
  return (
    <div className="impact-card">
      <h3 className="impact-card__title">ReSource Impact Card</h3>
      <dl className="impact-card__list">
        {FIELD_LABELS.map(({ key, label }) => (
          <div className="impact-card__item" key={key}>
            <dt className="impact-card__label">{label}</dt>
            <dd className="impact-card__value">{data[key]}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export default ImpactCard;
