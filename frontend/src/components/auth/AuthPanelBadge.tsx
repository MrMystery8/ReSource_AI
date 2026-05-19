import { KeyRound, LockKeyhole } from 'lucide-react';

/**
 * Decorative neon auth badge used on login/register panels.
 * Combines a lock + key motif to make the auth screens feel intentional
 * without competing with the main heading.
 */
export function AuthPanelBadge(): JSX.Element {
  return (
    <div
      aria-hidden="true"
      className="relative mx-auto mb-5 flex h-18 w-18 items-center justify-center rounded-2xl"
      style={{
        background:
          'radial-gradient(circle at 30% 25%, rgba(52, 211, 153, 0.16), rgba(0, 0, 0, 0.92) 72%)',
        border: '2px solid rgba(52, 211, 153, 0.72)',
        boxShadow: [
          '0 0 0 1px rgba(52, 211, 153, 0.24)',
          '0 0 18px rgba(52, 211, 153, 0.36)',
          '0 0 42px rgba(20, 184, 166, 0.20)',
          'inset 0 1px 0 rgba(255, 255, 255, 0.05)',
        ].join(', '),
      }}
    >
      <LockKeyhole
        className="drop-shadow-[0_0_10px_rgba(52,211,153,0.5)]"
        size={28}
        strokeWidth={2.2}
        style={{ color: '#5eead4' }}
      />

      <div
        className="absolute -right-1.5 -bottom-1.5 flex h-7 w-7 items-center justify-center rounded-full"
        style={{
          backgroundColor: '#000000',
          border: '1.5px solid rgba(52, 211, 153, 0.82)',
          boxShadow:
            '0 0 12px rgba(52, 211, 153, 0.34), 0 0 28px rgba(20, 184, 166, 0.16)',
        }}
      >
        <KeyRound
          size={14}
          strokeWidth={2.3}
          style={{ color: '#34d399' }}
        />
      </div>
    </div>
  );
}

export default AuthPanelBadge;
