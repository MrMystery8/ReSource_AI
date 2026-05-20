import { useMemo, useState } from 'react';
import { User as UserIcon } from 'lucide-react';

interface AvatarProps {
  name: string;
  src?: string;
  sizeClassName?: string;
  textClassName?: string;
  className?: string;
}

function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join('');
}

export function Avatar({
  name,
  src,
  sizeClassName = 'w-10 h-10',
  textClassName = 'text-sm',
  className = '',
}: AvatarProps): JSX.Element {
  const [hasError, setHasError] = useState(false);
  const initials = useMemo(() => getInitials(name), [name]);
  const showImage = !!src && !hasError;

  return (
    <span
      className={`relative inline-flex items-center justify-center overflow-hidden rounded-full shrink-0 ${sizeClassName} ${className}`.trim()}
      style={{ backgroundColor: 'var(--color-primary)', color: '#fff' }}
      aria-hidden="true"
    >
      {showImage ? (
        <img
          src={src}
          alt=""
          className="w-full h-full object-cover"
          loading="lazy"
          onError={() => setHasError(true)}
        />
      ) : initials ? (
        <span className={`font-bold ${textClassName}`.trim()}>{initials}</span>
      ) : (
        <UserIcon size={14} />
      )}
    </span>
  );
}
