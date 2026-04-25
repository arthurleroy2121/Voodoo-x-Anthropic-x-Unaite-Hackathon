'use client';

import { useEffect, useRef, useState } from 'react';

import { useApp } from '@/lib/state';
import { cn } from '@/lib/utils';

export function Sidebar() {
  const projectName = useApp((s) => s.projectName);
  const setProjectName = useApp((s) => s.setProjectName);

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const displayName = projectName ?? 'Demo Project';

  function startEdit() {
    setDraft(displayName);
    setEditing(true);
  }

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  function commit() {
    const trimmed = draft.trim();
    if (trimmed) setProjectName(trimmed);
    setEditing(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') commit();
    if (e.key === 'Escape') setEditing(false);
  }

  return (
    <nav className="flex h-full flex-col gap-6 p-6" aria-label="Project navigation">
      <div>
        <span className="text-sm font-semibold text-[--color-charcoal]">
          Voodoo Creative Radar
        </span>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-[--color-muted]">
          Projects
        </span>

        <ul className="flex flex-col gap-1">
          <li className="group">
            <div
              aria-current="page"
              className="flex items-center gap-2 rounded-md bg-[--color-bg] px-3 py-1.5 text-sm font-medium text-[--color-charcoal]"
            >
              <span className="text-[--color-accent]" aria-hidden="true">•</span>

              {editing ? (
                <input
                  ref={inputRef}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onBlur={commit}
                  onKeyDown={handleKeyDown}
                  className="min-w-0 flex-1 bg-transparent outline-none"
                  aria-label="Nom du projet"
                />
              ) : (
                <>
                  <span className="min-w-0 flex-1 truncate">{displayName}</span>
                  <button
                    type="button"
                    onClick={startEdit}
                    aria-label="Renommer le projet"
                    className="shrink-0 text-[--color-muted] opacity-0 transition-opacity group-hover:opacity-100 hover:text-[--color-charcoal] focus:opacity-100 focus:outline-none"
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                  </button>
                </>
              )}
            </div>
          </li>
        </ul>
      </div>

      <button
        type="button"
        disabled
        aria-disabled="true"
        title="Multi-project support is a future enhancement"
        className={cn(
          'mt-auto inline-flex items-center justify-start gap-2 rounded-md px-3 py-1.5 text-sm font-medium',
          'cursor-not-allowed opacity-40 text-[--color-charcoal]',
        )}
      >
        + New Project
      </button>
    </nav>
  );
}
