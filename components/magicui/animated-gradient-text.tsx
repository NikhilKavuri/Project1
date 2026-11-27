'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function AnimatedGradientText({
  children,
  className
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border border-[#e85334]/20 bg-[#e85334]/[0.07] px-3 py-1 text-xs font-semibold text-[#c93f22]',
        className
      )}
    >
      {children}
    </span>
  );
}
