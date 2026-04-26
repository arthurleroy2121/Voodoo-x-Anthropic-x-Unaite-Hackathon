import { cn } from '@/lib/utils';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
}

export function Select({ label, className, children, id, ...props }: SelectProps) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      {label && <span className="text-[var(--color-muted)]">{label}</span>}
      <select
        id={id}
        className={cn(
          'rounded-md border border-[var(--color-border)] bg-[var(--color-surface)]',
          'px-3 py-2 text-sm text-[var(--color-charcoal)]',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          className,
        )}
        {...props}
      >
        {children}
      </select>
    </label>
  );
}
