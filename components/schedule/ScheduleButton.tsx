'use client';

import { CalendarClock } from 'lucide-react';
import { useRef, useState } from 'react';

import { useApp } from '@/lib/state';
import type { Project } from '@/lib/types';
import { cn } from '@/lib/utils';

import { SchedulePopover } from './SchedulePopover';

export interface ScheduleButtonProps {
  project: Project;
  className?: string;
}

/**
 * CalendarClock icon rendered alongside each project row in the sidebar.
 * Per the Schedule PRD, this icon must be ALWAYS visible (not hover-only).
 * Clicking it opens a lightweight `<SchedulePopover>` anchored under the icon.
 */
export function ScheduleButton({ project, className }: ScheduleButtonProps) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);

  // Highlight the icon when the project already has a schedule, so users get a
  // glanceable signal in the sidebar without opening the popover.
  const hasSchedule = useApp((s) =>
    (s.schedules ?? []).some((sched) => sched.projectId === project.id),
  );

  return (
    <span className="relative inline-flex">
      <button
        ref={triggerRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        aria-label={
          hasSchedule
            ? `Edit schedule for ${project.name}`
            : `Schedule ${project.name}`
        }
        aria-expanded={open}
        aria-haspopup="dialog"
        title="Schedule"
        className={cn(
          'shrink-0 rounded p-1 transition-colors focus:outline-none',
          'focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-1',
          hasSchedule
            ? 'text-[var(--color-accent)] hover:opacity-80'
            : 'text-[var(--color-muted)] hover:text-[var(--color-charcoal)]',
          className,
        )}
      >
        <CalendarClock className="h-3.5 w-3.5" aria-hidden="true" />
      </button>

      {open && (
        <SchedulePopover
          project={project}
          anchorRef={triggerRef}
          onClose={() => setOpen(false)}
          placement="sidebar"
        />
      )}
    </span>
  );
}
