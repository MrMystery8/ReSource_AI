import './ResultsView.css';

export interface ProgressIndicatorProps {
  stageName: string;
}

export function ProgressIndicator({ stageName }: ProgressIndicatorProps) {
  return (
    <div className="progress-indicator" role="status" aria-live="polite">
      <span className="progress-indicator__spinner" aria-hidden="true" />
      <span className="progress-indicator__text">
        Processing: {stageName}...
      </span>
    </div>
  );
}

export default ProgressIndicator;
