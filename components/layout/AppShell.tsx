import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

export interface AppShellProps {
  sidebar: ReactNode;
  topbar?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function AppShell({ sidebar, topbar, children, className }: AppShellProps) {
  return (
    <div className={cn('flex min-h-screen bg-[--color-bg]', className)}>
      <aside className="w-64 shrink-0 border-r border-[--color-border] bg-[--color-surface]">
        {sidebar}
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        {topbar && (
          <header className="h-14 shrink-0 border-b border-[--color-border] bg-[--color-surface]">
            {topbar}
          </header>
        )}
        <main className="min-w-0 flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
