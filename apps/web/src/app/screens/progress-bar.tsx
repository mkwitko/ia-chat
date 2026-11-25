import { cn } from '@/lib/utils';

const PERCENT = 100;

interface ProgressBarProps {
  value: number;
  total: number;
  label: string;
  className?: string;
}

/** Setup progress in jade (DESIGN.md: jade marks where the assistant is being prepared). */
export function ProgressBar({ value, total, label, className }: Readonly<ProgressBarProps>) {
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={total}
      aria-valuenow={value}
      className={cn('h-1.5 overflow-hidden rounded-full bg-line-strong/60', className)}
    >
      <div
        className="h-full rounded-full bg-jade transition-[width] duration-300 ease-out"
        style={{ width: `${String((value / total) * PERCENT)}%` }}
      />
    </div>
  );
}
