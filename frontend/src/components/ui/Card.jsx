import { cn } from '../../lib/cn.js';

export default function Card({ className, children, as: Tag = 'div', ...props }) {
  return (
    <Tag className={cn('card p-5', className)} {...props}>
      {children}
    </Tag>
  );
}

export function CardHeader({ title, subtitle, right, className }) {
  return (
    <div className={cn('flex items-start justify-between gap-3 mb-4', className)}>
      <div>
        <h3 className="text-sm font-semibold text-ink-primary">{title}</h3>
        {subtitle && <p className="text-xs text-ink-muted mt-0.5">{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}
