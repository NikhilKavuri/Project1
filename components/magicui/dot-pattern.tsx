import { useId } from 'react';
import { cn } from '@/lib/utils';

export function DotPattern({ className }: { className?: string }) {
  const id = useId();
  return (
    <svg
      aria-hidden="true"
      className={cn('pointer-events-none absolute inset-0 h-full w-full fill-slate-500/20', className)}
    >
      <defs>
        <pattern id={id} width="16" height="16" patternUnits="userSpaceOnUse" patternContentUnits="userSpaceOnUse">
          <circle cx="1.5" cy="1.5" r="1.2" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" strokeWidth="0" fill={`url(#${id})`} />
    </svg>
  );
}
