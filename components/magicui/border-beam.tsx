'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export function BorderBeam({
  className,
  duration = 8,
  colorFrom = '#e85334',
  colorTo = '#6366f1'
}: {
  className?: string;
  duration?: number;
  colorFrom?: string;
  colorTo?: string;
}) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]',
        className
      )}
    >
      <motion.div
        className="absolute -inset-[1px] rounded-[inherit] opacity-35"
        style={{
          background: `conic-gradient(from 0deg, transparent 70%, ${colorFrom} 85%, ${colorTo} 95%, transparent 100%)`,
          WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
          WebkitMaskComposite: 'xor',
          maskComposite: 'exclude',
          padding: '1.5px'
        }}
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, ease: 'linear', duration }}
      />
    </div>
  );
}
