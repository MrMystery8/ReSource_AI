import type { JSX } from 'react';

interface GoogleLogoProps {
  className?: string;
}

export function GoogleLogo({ className = 'w-4 h-4' }: GoogleLogoProps): JSX.Element {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.49 12.27c0-.79-.07-1.54-.2-2.27H12v4.51h6.44a5.51 5.51 0 0 1-2.39 3.62v3h3.86c2.26-2.08 3.58-5.13 3.58-8.86z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.07 7.93-2.91l-3.86-3a7.14 7.14 0 0 1-10.62-3.75H1.46v3.09A12 12 0 0 0 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.45 14.34a7.2 7.2 0 0 1 0-4.68V6.57H1.46a12 12 0 0 0 0 10.86l3.99-3.09z"
      />
      <path
        fill="#EA4335"
        d="M12 4.77c1.76 0 3.34.61 4.58 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.46 6.57l3.99 3.09A7.14 7.14 0 0 1 12 4.77z"
      />
    </svg>
  );
}
