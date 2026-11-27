import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function BentoGrid({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('grid w-full grid-cols-1 gap-4 md:grid-cols-12', className)}>
      {children}
    </div>
  );
}

export function BentoTile({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-3xl border border-slate-900/[0.06] bg-white p-5 shadow-[0_4px_24px_-6px_rgba(24,28,36,0.06)] sm:p-6',
        className
      )}
    >
      {children}
    </div>
  );
}
