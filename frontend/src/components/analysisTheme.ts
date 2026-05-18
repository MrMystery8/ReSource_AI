import type { CSSProperties } from 'react';

export const ANALYSIS_EMERALD = '#34d399';
export const ANALYSIS_WHITE = '#ffffff';
export const ANALYSIS_BODY_WHITE = 'rgba(255,255,255,0.9)';
export const ANALYSIS_MUTED_WHITE = 'rgba(255,255,255,0.62)';
export const ANALYSIS_SOFT_SURFACE = 'rgba(7, 23, 18, 0.96)';
export const ANALYSIS_SUBTLE_SURFACE = 'rgba(8, 18, 14, 0.84)';
export const ANALYSIS_WHITE_GLOW = '0 0 12px rgba(255, 255, 255, 0.18)';
export const ANALYSIS_EMERALD_GLOW =
  '0 0 10px rgba(52, 211, 153, 0.22), 0 0 24px rgba(52, 211, 153, 0.12)';

export const ANALYSIS_PANEL_STYLE: CSSProperties = {
  backgroundColor: '#000000',
  borderColor: 'rgba(52, 211, 153, 0.58)',
  borderWidth: '2px',
  boxShadow: [
    'inset 0 0 0 1px rgba(52, 211, 153, 0.10)',
    '0 0 0 1px rgba(52, 211, 153, 0.22)',
    '0 0 12px rgba(52, 211, 153, 0.18)',
    '0 0 28px rgba(16, 185, 129, 0.10)',
    '0 18px 54px rgba(0, 0, 0, 0.42)',
  ].join(', '),
};
