'use client';

import { motion, useMotionTemplate, useMotionValue } from 'framer-motion';
import type { MouseEvent, ReactNode } from 'react';
import { cn } from '@/lib/utils';

type MagicCardProps = {
  children: ReactNode;
  className?: string;
  gradientColor?: string;
};

export function MagicCard({
  children,
  className,
  gradientColor = 'rgba(108, 144, 184, 0.10)'
}: MagicCardProps) {
  const mouseX = useMotionValue(-200);
  const mouseY = useMotionValue(-200);

  function handleMouseMove(e: MouseEvent<HTMLDivElement>) {
    const { left, top } = e.currentTarget.getBoundingClientRect();
    mouseX.set(e.clientX - left);
    mouseY.set(e.clientY - top);
  }

  function handleMouseLeave() {
    mouseX.set(-200);
    mouseY.set(-200);
  }

  const background = useMotionTemplate`radial-gradient(320px circle at ${mouseX}px ${mouseY}px, ${gradientColor}, transparent 80%)`;

  return (
    <div
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={cn(
        'group relative overflow-hidden rounded-3xl border border-slate-900/[0.06] bg-white shadow-[0_4px_24px_-6px_rgba(24,28,36,0.06)] transition-shadow duration-300 hover:shadow-[0_12px_32px_-8px_rgba(24,28,36,0.10)]',
        className
      )}
    >
      <motion.div
        className="pointer-events-none absolute -inset-px rounded-3xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{ background }}
      />
      <div className="relative z-10 h-full">{children}</div>
    </div>
  );
}
