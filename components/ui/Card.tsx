import { cn } from '@/lib/utils';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  description?: string;
}

export function Card({
  title,
  description,
  children,
  className,
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        'rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-sm',
        className,
      )}
      {...props}
    >
      {title && (
        <h2 className="text-base font-semibold text-[var(--color-charcoal)] mb-1">
          {title}
        </h2>
      )}
      {description && (
        <p className="text-sm text-[var(--color-muted)] mb-4">{description}</p>
      )}
      {children}
    </div>
  );
}
