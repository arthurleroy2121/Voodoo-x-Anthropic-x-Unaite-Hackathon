import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export function Input({ label, className, id, ...props }: InputProps) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      {label && <span className="text-[--color-muted]">{label}</span>}
      <input
        id={id}
        className={cn(
          'rounded-md border border-[--color-border] bg-[--color-surface]',
          'px-3 py-2 text-sm text-[--color-charcoal]',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-[--color-accent]',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          className,
        )}
        {...props}
      />
    </label>
  );
}
