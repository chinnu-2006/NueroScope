import Card, { CardHeader } from '../ui/Card.jsx';
import { cn } from '../../lib/cn.js';

/** Wrapper for a chart with title + subtitle + optional right slot. */
export default function ChartCard({ title, subtitle, right, height = 260, className, children }) {
  return (
    <Card className={cn('!p-5', className)}>
      <CardHeader title={title} subtitle={subtitle} right={right} />
      <div style={{ width: '100%', height }}>{children}</div>
    </Card>
  );
}
