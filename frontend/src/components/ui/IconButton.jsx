import { cn } from '../../lib/cn.js';

export default function IconButton({ size = 'md', className, children, ...props }) {
  const sizes = {
    sm: 'h-8 w-8',
    md: 'h-9 w-9',
    lg: 'h-10 w-10',
  };
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center rounded-md text-ink-secondary',
        'hairline bg-surface-elevated hover:bg-surface-hover hover:text-ink-primary',
        'transition-colors duration-fast ease-out',
        sizes[size],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
