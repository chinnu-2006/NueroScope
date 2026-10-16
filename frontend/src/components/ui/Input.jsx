import { forwardRef } from 'react';
import { cn } from '../../lib/cn.js';

const Input = forwardRef(function Input(
  { className, prefix, suffix, ...props },
  ref,
) {
  return (
    <div
      className={cn(
        'flex items-center gap-2.5 h-11 px-3.5 rounded-md text-sm',
        'bg-surface-elevated hairline focus-within:border-[color:var(--accent-blue)]',
        'focus-within:shadow-[0_0_0_3px_rgba(59,130,246,0.15)]',
        'transition-shadow duration-fast ease-out',
        className,
      )}
    >
      {prefix && <span className="text-ink-muted shrink-0">{prefix}</span>}
      <input
        ref={ref}
        className="flex-1 bg-transparent outline-none text-ink-primary placeholder:text-ink-muted"
        {...props}
      />
      {suffix && <span className="shrink-0">{suffix}</span>}
    </div>
  );
});

export default Input;
