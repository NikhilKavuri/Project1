'use client';

import { animate, useMotionValue, useTransform, motion } from 'framer-motion';
import { useEffect } from 'react';
import { cn } from '@/lib/utils';

export function NumberTicker({ value, className }: { value: number; className?: string }) {
  const motionValue = useMotionValue(0);
  const rounded = useTransform(motionValue, latest => Math.round(latest).toLocaleString());

  useEffect(() => {
    const controls = animate(motionValue, value, { duration: 0.55, ease: [0.22, 1, 0.36, 1] });
    return () => controls.stop();
  }, [motionValue, value]);

  return <motion.span className={cn('tabular-nums', className)}>{rounded}</motion.span>;
}
