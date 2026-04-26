'use client';

import { useApp } from '@/lib/state';

export function TopBar() {
  const projects = useApp((s) => s.projects);
  const currentProjectId = useApp((s) => s.currentProjectId);
  const current = projects?.find((p) => p.id === currentProjectId);
  const displayName = current?.name ?? 'Demo Project';

  return (
    <div className="flex h-full items-center px-6">
      <h1 className="text-sm font-semibold text-[var(--color-charcoal)]">
        {displayName} — Voodoo Creative Radar
      </h1>
    </div>
  );
}
