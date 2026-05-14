/**
 * SkipLink — accessibility component
 *
 * Visually hidden by default; becomes visible when it receives keyboard focus.
 * Must be the first focusable element in the DOM (rendered before everything
 * else in AppShell) so keyboard users can skip repetitive navigation.
 *
 * Requirements: 4.8, 10.4
 */

import React from 'react';

const skipLinkStyles: React.CSSProperties = {
  // sr-only pattern: visually hidden
  position: 'absolute',
  width: '1px',
  height: '1px',
  padding: 0,
  margin: '-1px',
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  border: 0,
};

// Inline CSS for the focus-visible state is injected once via a <style> tag
// so we can use the :focus-visible pseudo-class without a CSS module or
// Tailwind class (which would require the class to be in the stylesheet).
const SKIP_LINK_STYLE_ID = 'skip-link-styles';

function injectSkipLinkStyles(): void {
  if (typeof document === 'undefined') return;
  if (document.getElementById(SKIP_LINK_STYLE_ID)) return;

  const style = document.createElement('style');
  style.id = SKIP_LINK_STYLE_ID;
  style.textContent = `
    .skip-link:focus-visible {
      position: fixed !important;
      top: 1rem !important;
      left: 1rem !important;
      z-index: 9999 !important;
      width: auto !important;
      height: auto !important;
      padding: 0.75rem 1.25rem !important;
      margin: 0 !important;
      overflow: visible !important;
      clip: auto !important;
      white-space: normal !important;
      background-color: var(--color-primary, #059669) !important;
      color: #ffffff !important;
      font-size: 1rem !important;
      font-weight: 600 !important;
      border-radius: var(--radius-md, 8px) !important;
      text-decoration: none !important;
      outline: 3px solid var(--color-primary-hover, #047857) !important;
      outline-offset: 2px !important;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3) !important;
    }
  `;
  document.head.appendChild(style);
}

export function SkipLink(): JSX.Element {
  // Inject styles on first render (client-side only)
  React.useEffect(() => {
    injectSkipLinkStyles();
  }, []);

  return (
    <a
      href="#main-content"
      className="skip-link"
      style={skipLinkStyles}
    >
      Skip to main content
    </a>
  );
}

export default SkipLink;
