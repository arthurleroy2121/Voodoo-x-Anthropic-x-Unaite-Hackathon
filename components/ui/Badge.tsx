import { cn } from '@/lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'neutral' | 'accent';
}

export function Badge({
  variant = 'neutral',
  className,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        variant === 'neutral' &&
          'bg-[var(--color-border)] text-[var(--color-charcoal)]',
        variant === 'accent' &&
          'bg-[var(--color-accent)] text-white',
        className,
      )}
      {...props}
    />
  );
}
