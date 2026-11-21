import { useState } from 'react';
import { Award } from 'lucide-react';
import { COLLECTIBLE_EMBLEMS } from '../data/progression';

interface EmblemAvatarProps {
  emblemId: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function EmblemAvatar({ emblemId, size = 'md', className = '' }: EmblemAvatarProps) {
  const [imgFailed, setImgFailed] = useState(false);
  const emblem = COLLECTIBLE_EMBLEMS.find((e) => e.id === emblemId) ?? COLLECTIBLE_EMBLEMS[0];

  const sizeClasses =
    size === 'sm'
      ? 'w-10 h-10 rounded-lg'
      : size === 'lg'
        ? 'w-24 h-24 rounded-xl'
        : 'w-14 h-14 rounded-xl';

  if (imgFailed) {
    return (
      <div
        className={`${sizeClasses} ${emblem.fallbackColor} border flex items-center justify-center shrink-0 ${className}`}
        aria-label={emblem.name}
      >
        <Award className={size === 'sm' ? 'w-5 h-5' : size === 'lg' ? 'w-10 h-10' : 'w-6 h-6'} />
      </div>
    );
  }

  return (
    <div
      className={`${sizeClasses} overflow-hidden border border-slate-200 bg-slate-100 shrink-0 ${className}`}
    >
      <img
        src={emblem.imagePath}
        alt={emblem.name}
        referrerPolicy="no-referrer"
        onError={() => setImgFailed(true)}
        className="w-full h-full object-cover"
      />
    </div>
  );
}
