import { KeyRound, LockKeyhole } from 'lucide-react';

export function AuthPanelBadge(): JSX.Element {
  return (
    <div
      aria-hidden="true"
      className="relative mx-auto mb-5 flex h-18 w-18 items-center justify-center rounded-2xl"
      style={{
        background:
          'radial-gradient(circle at 30% 25%, rgba(52, 211, 153, 0.14), rgba(7, 23, 18, 0.94) 70%)',
        border: '1.5px solid rgba(52, 211, 153, 0.4)',
      }}
    >
      <LockKeyhole size={28} strokeWidth={2.2} style={{ color: '#c8ffe8' }} />

      <div
        className="absolute -right-1.5 -bottom-1.5 flex h-7 w-7 items-center justify-center rounded-full"
        style={{
          backgroundColor: 'rgba(4, 12, 10, 0.98)',
          border: '1.5px solid rgba(52, 211, 153, 0.5)',
        }}
      >
        <KeyRound size={14} strokeWidth={2.3} style={{ color: '#34d399' }} />
      </div>
    </div>
  );
}

export default AuthPanelBadge;
