/**
 * Design System Token Definitions
 *
 * TypeScript interfaces and constant values for the ReSource AI design system.
 * These types mirror the CSS custom properties defined in tokens.css and are
 * exported for use in property-based tests and component logic.
 *
 * Validates: Requirements 1.1, 1.6
 */

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

/**
 * Semantic color tokens for a single theme.
 * All values are CSS color strings (hex, rgb, hsl, etc.).
 */
export interface ColorTokens {
  surface: string;
  'surface-elevated': string;
  'surface-card': string;
  'border-default': string;
  'border-subtle': string;
  'text-primary': string;
  'text-secondary': string;
  'text-muted': string;
  primary: string;
  'primary-hover': string;
  error: string;
  success: string;
  warning: string;
}

/**
 * Combined light + dark theme token map.
 */
export interface ThemeTokens {
  light: ColorTokens;
  dark: ColorTokens;
}

/**
 * A single entry in the type scale.
 * - size: font size in pixels
 * - lineHeight: unitless ratio (e.g. 1.5)
 * - weight: CSS font-weight value
 * - role: semantic role name (e.g. 'body', 'heading', 'caption')
 */
export interface TypeScaleEntry {
  size: number;       // px
  lineHeight: number; // unitless ratio
  weight: number;     // font-weight
  role: string;       // semantic role name
}

/**
 * Spacing scale keyed by step number.
 * Values are in pixels (e.g. '1' → 4, '2' → 8, …).
 */
export interface SpacingScale {
  [key: string]: number;
}

/**
 * Elevation scale expressed as CSS box-shadow values.
 */
export interface ElevationScale {
  sm: string;
  md: string;
  lg: string;
}

/**
 * Border-radius scale in pixels.
 */
export interface RadiusScale {
  sm: number; // 6px
  md: number; // 8px
  lg: number; // 12px
}

// ---------------------------------------------------------------------------
// Token Constants
// ---------------------------------------------------------------------------

/**
 * Light theme color tokens.
 * Validates: Requirement 1.1 (surface, border, text, primary, error, success, warning)
 */
export const LIGHT_TOKENS: ColorTokens = {
  surface: '#fafdfb',
  'surface-elevated': '#f2faf5',
  'surface-card': '#ffffff',
  'border-default': '#d6e8dc',
  'border-subtle': '#e8f5ec',
  'text-primary': '#1c1917',
  'text-secondary': '#57534e',
  'text-muted': '#a8a29e',
  primary: '#059669',
  'primary-hover': '#047857',
  error: '#dc2626',
  success: '#059669',
  warning: '#d97706',
};

/**
 * Dark theme color tokens.
 * Green-tinted near-black surfaces, emerald primary, amber accent.
 * Validates: Requirement 1.1, 2.7
 */
export const DARK_TOKENS: ColorTokens = {
  surface: '#080e09',
  'surface-elevated': '#0f1710',
  'surface-card': '#141c18',
  'border-default': '#1e3028',
  'border-subtle': '#172419',
  'text-primary': '#f5f5f0',
  'text-secondary': '#a8a29e',
  'text-muted': '#78716c',
  primary: '#34d399',
  'primary-hover': '#6ee7b7',
  error: '#f87171',
  success: '#34d399',
  warning: '#fbbf24',
};

/**
 * Combined theme tokens constant.
 */
export const THEME_TOKENS: ThemeTokens = {
  light: LIGHT_TOKENS,
  dark: DARK_TOKENS,
};

/**
 * Type scale entries.
 * Sizes: 12, 14, 16, 18, 24, 32px.
 * Line-heights: 1.5–1.75 for body (14–18px), 1.2–1.4 for headings (24–32px).
 * Validates: Requirements 1.2, 1.8
 */
export const TYPE_SCALE: Record<string, TypeScaleEntry> = {
  caption: {
    size: 12,
    lineHeight: 1.5,
    weight: 400,
    role: 'caption',
  },
  'body-sm': {
    size: 14,
    lineHeight: 1.5,
    weight: 400,
    role: 'secondary body text',
  },
  body: {
    size: 16,
    lineHeight: 1.625,
    weight: 400,
    role: 'primary body text',
  },
  subheading: {
    size: 18,
    lineHeight: 1.75,
    weight: 600,
    role: 'subheading',
  },
  heading: {
    size: 24,
    lineHeight: 1.3,
    weight: 600,
    role: 'section heading',
  },
  'page-title': {
    size: 32,
    lineHeight: 1.2,
    weight: 700,
    role: 'page title',
  },
};

/**
 * Spacing scale based on 4px increments.
 * Keys are step numbers; values are pixel amounts.
 * Validates: Requirement 1.3
 */
export const SPACING_SCALE: SpacingScale = {
  '1': 4,
  '2': 8,
  '3': 12,
  '4': 16,
  '5': 20,
  '6': 24,
  '8': 32,
  '10': 40,
  '12': 48,
  '16': 64,
};

/**
 * Elevation scale as CSS box-shadow values.
 * Each level produces a minimum 1px visible shadow offset in both themes.
 * Validates: Requirement 1.5
 */
export const ELEVATION_SCALE: ElevationScale = {
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
};

/**
 * Border-radius scale in pixels.
 * Validates: Requirement 1.7
 */
export const RADIUS_SCALE: RadiusScale = {
  sm: 6,
  md: 8,
  lg: 12,
};
