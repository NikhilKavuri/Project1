'use client';

import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function ShimmerButton({
  children,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode }) {
  return (
    <button
      {...props}
      className={cn(
        'group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-full bg-[#141518] px-5 py-2.5 text-xs font-semibold text-white shadow-sm transition-all duration-200 hover:bg-[#23262c] active:scale-[0.98] disabled:pointer-events-none disabled:opacity-60',
        className
      )}
    >
      <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/15 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
      <span className="relative z-10 inline-flex items-center gap-1.5">{children}</span>
    </button>
  );
}
