import { cn } from '../../lib/cn.js';

/** Shimmer-styled skeleton block. Compose to fake any layout. */
export default function Skeleton({ className }) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-md bg-white/[0.03]',
        'before:absolute before:inset-0 before:-translate-x-full',
        'before:bg-gradient-to-r before:from-transparent before:via-white/[0.06] before:to-transparent',
        'before:animate-[shimmer_1.6s_infinite]',
        className,
      )}
      aria-hidden="true"
    />
  );
}
