'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { useApp } from '@/lib/state';
import { cn } from '@/lib/utils';

import { SidebarLogo } from './SidebarLogo';

export function Sidebar() {
  const router = useRouter();
  const projects = useApp((s) => s.projects) ?? [];
  const currentProjectId = useApp((s) => s.currentProjectId);
  const addProject = useApp((s) => s.addProject);
  const selectProject = useApp((s) => s.selectProject);
  const renameProject = useApp((s) => s.renameProject);
  const removeProject = useApp((s) => s.removeProject);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingId) inputRef.current?.focus();
  }, [editingId]);

  function startEdit(id: string, currentName: string) {
    setDraft(currentName);
    setEditingId(id);
  }

  function commit() {
    if (editingId) renameProject(editingId, draft);
    setEditingId(null);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') commit();
    if (e.key === 'Escape') setEditingId(null);
  }

  function handleNewProject() {
    addProject();
    router.push('/project');
  }

  return (
    <nav className="flex h-full flex-col gap-6 p-6" aria-label="Project navigation">
      <div>
        <SidebarLogo />
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-[var(--color-muted)]">
          Projects
        </span>

        {projects.length > 0 && (
          <ul className="flex flex-col gap-1">
            {projects.map((project) => {
              const isActive = project.id === currentProjectId;
              const isEditing = editingId === project.id;
              return (
                <li key={project.id} className="group">
                  <div
                    {...(isActive ? { 'aria-current': 'page' as const } : {})}
                    className={cn(
                      'flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium text-[var(--color-charcoal)]',
                      isActive ? 'bg-[var(--color-bg)]' : 'hover:bg-[var(--color-bg)]',
                    )}
                  >
                    <span
                      className={cn(isActive ? 'text-[var(--color-accent)]' : 'text-transparent')}
                      aria-hidden="true"
                    >
                      •
                    </span>

                    {isEditing ? (
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
                        <button
                          type="button"
                          onClick={() => {
                            selectProject(project.id);
                            router.push('/project');
                          }}
                          className="min-w-0 flex-1 truncate text-left"
                        >
                          {project.name}
                        </button>
                        {isActive && (
                          <button
                            type="button"
                            onClick={() => startEdit(project.id, project.name)}
                            aria-label="Renommer le projet"
                            className="shrink-0 text-[var(--color-muted)] opacity-0 transition-opacity group-hover:opacity-100 hover:text-[var(--color-charcoal)] focus:opacity-100 focus:outline-none"
                          >
                            <svg
                              width="13"
                              height="13"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              aria-hidden="true"
                            >
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => removeProject(project.id)}
                          aria-label="Supprimer le projet"
                          className="shrink-0 text-[var(--color-muted)] opacity-0 transition-opacity group-hover:opacity-100 hover:text-red-500 focus:opacity-100 focus:outline-none"
                        >
                          <svg
                            width="13"
                            height="13"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden="true"
                          >
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                            <path d="M10 11v6M14 11v6" />
                            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                          </svg>
                        </button>
                      </>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        <button
          type="button"
          onClick={handleNewProject}
          aria-label="Nouveau projet"
          className="inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium text-[var(--color-muted)] transition-colors hover:bg-[var(--color-bg)] hover:text-[var(--color-charcoal)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
        >
          <span aria-hidden="true">+</span>
          <span>Nouveau projet</span>
        </button>
      </div>
    </nav>
  );
}
