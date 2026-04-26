'use client';

import { Pencil, Trash2 } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';

import { useApp } from '@/lib/state';
import type { Project, ProjectSchedule } from '@/lib/types';
import { cn } from '@/lib/utils';

import { getProjectGameName } from './getProjectGameName';
import { SchedulePopover } from './SchedulePopover';
import { ScheduleStatusBadge } from './ScheduleStatusBadge';

const COLUMNS: { key: keyof ProjectSchedule | 'actions'; label: string }[] = [
  { key: 'projectName', label: 'Project' },
  { key: 'associatedGame', label: 'Associated Game' },
  { key: 'recurrence', label: 'Recurrence' },
  { key: 'time', label: 'Time' },
  { key: 'status', label: 'Status' },
  { key: 'actions', label: '' },
];

export function ScheduleTable() {
  // Read raw refs from the store; the `?? []` lives inside the consumer hooks
  // so the selector identity stays stable and exhaustive-deps stays happy.
  const schedulesRaw = useApp((s) => s.schedules);
  const projectsRaw = useApp((s) => s.projects);
  const removeSchedule = useApp((s) => s.removeSchedule);

  const [editingId, setEditingId] = useState<string | null>(null);

  const schedules = schedulesRaw ?? [];

  const projectById = useMemo(() => {
    const map = new Map<string, Project>();
    for (const p of projectsRaw ?? []) map.set(p.id, p);
    return map;
  }, [projectsRaw]);

  if (schedules.length === 0) {
    return (
      <div
        className="rounded-lg border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-10 text-center"
        role="status"
      >
        <p className="text-sm font-medium text-[var(--color-charcoal)]">
          No scheduled projects yet.
        </p>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          Use the calendar icon next to a project to create a schedule.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]">
      <table className="w-full text-sm">
        <thead className="bg-[var(--color-bg)] text-left">
          <tr>
            {COLUMNS.map((c) => (
              <th
                key={String(c.key)}
                scope="col"
                className={cn(
                  'px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[var(--color-muted)]',
                  c.key === 'actions' && 'text-right',
                )}
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {schedules.map((schedule) => {
            // The project might have been deleted in another tab — guard for it
            // even though `removeProject` cascades. We display the snapshot
            // values (game name, project name) saved on the schedule itself
            // when the project is gone.
            const project = projectById.get(schedule.projectId);
            // Resolve the display name from the live project when available,
            // otherwise fall back to whatever was snapshotted at save time.
            const displayGame = project
              ? getProjectGameName(project)
              : schedule.associatedGame;
            const displayName = project?.name ?? schedule.projectName;
            return (
              <ScheduleRow
                key={schedule.id}
                schedule={schedule}
                project={project}
                displayGame={displayGame}
                displayName={displayName}
                isEditing={editingId === schedule.id}
                onEdit={() => setEditingId(schedule.id)}
                onCloseEdit={() => setEditingId(null)}
                onRemove={() => {
                  if (editingId === schedule.id) setEditingId(null);
                  removeSchedule(schedule.id);
                }}
              />
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

interface ScheduleRowProps {
  schedule: ProjectSchedule;
  project: Project | undefined;
  displayGame: string;
  displayName: string;
  isEditing: boolean;
  onEdit: () => void;
  onCloseEdit: () => void;
  onRemove: () => void;
}

function ScheduleRow({
  schedule,
  project,
  displayGame,
  displayName,
  isEditing,
  onEdit,
  onCloseEdit,
  onRemove,
}: ScheduleRowProps) {
  const editButtonRef = useRef<HTMLButtonElement>(null);

  return (
    <tr className="border-t border-[var(--color-border)]">
      <td className="px-4 py-3 font-medium text-[var(--color-charcoal)]">
        {displayName}
        {!project && (
          <span className="ml-2 text-xs text-[var(--color-muted)]">
            (project removed)
          </span>
        )}
      </td>
      <td className="px-4 py-3 text-[var(--color-charcoal)]">
        {displayGame}
      </td>
      <td className="px-4 py-3 text-[var(--color-charcoal)]">
        {schedule.recurrence}
      </td>
      <td className="px-4 py-3 font-mono text-[var(--color-charcoal)]">
        {schedule.time}
      </td>
      <td className="px-4 py-3">
        <ScheduleStatusBadge status={schedule.status} />
      </td>
      <td className="px-4 py-3 text-right">
        <div className="relative inline-flex items-center justify-end gap-1">
          <button
            ref={editButtonRef}
            type="button"
            onClick={onEdit}
            disabled={!project}
            aria-label={`Edit schedule for ${schedule.projectName}`}
            aria-expanded={isEditing}
            aria-haspopup="dialog"
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-[var(--color-muted)] hover:bg-[var(--color-bg)] hover:text-[var(--color-charcoal)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
            Edit
          </button>
          <button
            type="button"
            onClick={onRemove}
            aria-label={`Remove schedule for ${schedule.projectName}`}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-[var(--color-muted)] hover:bg-[var(--color-bg)] hover:text-red-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            Remove
          </button>

          {isEditing && project && (
            <SchedulePopover
              project={project}
              anchorRef={editButtonRef}
              onClose={onCloseEdit}
              placement="floating"
            />
          )}
        </div>
      </td>
    </tr>
  );
}
