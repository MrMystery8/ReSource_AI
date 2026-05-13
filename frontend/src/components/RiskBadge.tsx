import type { RiskLevel } from '@resource-ai/shared';
import './ResultsView.css';

export interface RiskBadgeProps {
  level: RiskLevel;
}

const RISK_CLASS_MAP: Record<RiskLevel, string> = {
  Green: 'risk-badge--green',
  Yellow: 'risk-badge--yellow',
  Orange: 'risk-badge--orange',
  Red: 'risk-badge--red',
};

export function RiskBadge({ level }: RiskBadgeProps) {
  return (
    <span
      className={`risk-badge ${RISK_CLASS_MAP[level]}`}
      role="status"
      aria-label={`Risk level: ${level}`}
    >
      {level}
    </span>
  );
}

export default RiskBadge;
