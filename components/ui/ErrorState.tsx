'use client';

import { AlertCircle } from 'lucide-react';

import { cn } from '@/lib/utils';

export interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({ message, onRetry, className }: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        'flex items-start gap-3 rounded-md border border-red-200 bg-red-50 p-4',
        className,
      )}
    >
      <AlertCircle className="mt-0.5 size-5 shrink-0 text-red-600" aria-hidden="true" />
      <div className="flex flex-col gap-2">
        <p className="text-sm text-red-700">{message}</p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="self-start text-sm font-medium text-red-600 underline hover:text-red-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-600"
          >
            Retry
          </button>
        )}
      </div>
    </div>
  );
}
