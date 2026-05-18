export const TRIAGE_CONTENT = {
  title: 'Device Triage',
  subtitle: 'Analyze salvage potential, safety risks, and second-life ideas',
  submitIdleLabel: 'Analyze Device',
  submitLoadingLabel: 'Analyzing...',
} as const;

export const RESULTS_CONTENT = {
  heroTitle: 'Analysis Results',
  heroProcessingSubtitle: 'Running safety, salvage, and second-life stages now.',
  heroCompleteSubtitle: 'All core stages are complete. Review the recommended route below.',
  heroFailedSubtitle: 'The analysis pipeline hit an error before completion.',
  processingTitle: 'Analyzing your device...',
  completeTitle: 'Analysis Complete',
  failedTitle: 'Analysis Failed',
  connectingTitle: 'Connecting to analysis pipeline...',
} as const;
