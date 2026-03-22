import type { PresenceStatus } from '@/hooks/usePresence';

interface StatusDotProps {
  status: PresenceStatus;
  size?: 'sm' | 'md';
}

export function StatusDot({ status, size = 'sm' }: StatusDotProps) {
  const sizeClass = size === 'sm' ? 'h-2.5 w-2.5 border-2' : 'h-3 w-3 border-2';
  const color = status === 'online' ? 'bg-green-500' : 'bg-yellow-400';

  return (
    <div className={`absolute -bottom-0.5 -right-0.5 rounded-full border-white ${sizeClass} ${color}`} />
  );
}
