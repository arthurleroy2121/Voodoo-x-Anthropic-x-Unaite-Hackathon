'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { Button } from '@/components/ui/Button';
import { useApp } from '@/lib/state';
import type { Project, ProjectSchedule } from '@/lib/types';
import { cn } from '@/lib/utils';

import { getProjectGameName } from './getProjectGameName';
import { PreviewNotice } from './PreviewNotice';
import { ScheduledPipelineCard } from './ScheduledPipelineCard';

export interface SchedulePopoverProps {
  /** Project the schedule belongs to. We always operate on `project.id`. */
  project: Project;
  /** Anchor for click-outside detection (the icon/button that opened us). */
  anchorRef: React.RefObject<HTMLElement | null>;
  onClose: () => void;
  /**
   * `sidebar` anchors the popover to the trigger via normal flow (works
   * because the sidebar uses `position: relative` ancestors and has no
   * `overflow-hidden` along the chain). `floating` renders the popover into
   * a `<body>` portal and positions it via `getBoundingClientRect` — required
   * for triggers nested inside containers with `overflow-hidden` (e.g. the
   * schedule table).
   */
  placement?: 'sidebar' | 'floating';
  /** When `true`, renders a tiny inline header (used in /schedule page). */
  compact?: boolean;
}

const RECURRENCES: ProjectSchedule['recurrence'][] = ['Daily', 'Weekly'];
const STATUSES: ProjectSchedule['status'][] = ['Active', 'Paused'];

/**
 * Lightweight configuration panel for a project's schedule. Reads any existing
 * schedule for `project.id` from the store and pre-fills the form when present
 * so the same component handles both *create* and *edit* flows.
 *
 * IMPORTANT: Save persists to the Zustand store (and via `persist` to
 * localStorage). It NEVER calls Sensor Tower / Gemini / Scenario / any backend.
 */
export function SchedulePopover({
  project,
  anchorRef,
  onClose,
  placement = 'sidebar',
  compact = false,
}: SchedulePopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null);
  const formId = useId();

  const schedulesRaw = useApp((s) => s.schedules);
  const addSchedule = useApp((s) => s.addSchedule);
  const updateSchedule = useApp((s) => s.updateSchedule);

  const existing = useMemo(
    () => (schedulesRaw ?? []).find((s) => s.projectId === project.id),
    [schedulesRaw, project.id],
  );

  const associatedGame = getProjectGameName(project);

  const [recurrence, setRecurrence] = useState<ProjectSchedule['recurrence']>(
    existing?.recurrence ?? 'Daily',
  );
  const [time, setTime] = useState<string>(existing?.time ?? '09:00');
  const [status, setStatus] = useState<ProjectSchedule['status']>(
    existing?.status ?? 'Active',
  );

  // ── Derived-state pattern (React 19 official idiom) ───────────────────────
  // When the existing schedule changes identity (different `id`), we resync
  // the form fields to reflect the new source of truth. Doing this with a
  // setState-during-render comparison avoids the `react-hooks/
  // set-state-in-effect` rule and prevents the cascading-render anti-pattern.
  // See: https://react.dev/reference/react/useState#storing-information-from-previous-renders
  const [trackedExistingId, setTrackedExistingId] = useState<string | undefined>(
    existing?.id,
  );
  if (trackedExistingId !== existing?.id) {
    setTrackedExistingId(existing?.id);
    if (existing) {
      setRecurrence(existing.recurrence);
      setTime(existing.time);
      setStatus(existing.status);
    }
  }

  // Close on Escape.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  // Close on outside click (excluding both the popover and its anchor).
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as Node | null;
      if (!target) return;
      if (popoverRef.current?.contains(target)) return;
      if (anchorRef.current?.contains(target)) return;
      onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [anchorRef, onClose]);

  const handleSave = () => {
    // UI-only: no fetch / no API call. Saving === writing to the store.
    if (existing) {
      updateSchedule(existing.id, {
        projectName: project.name,
        associatedGame,
        recurrence,
        time,
        status,
      });
    } else {
      addSchedule({
        projectId: project.id,
        projectName: project.name,
        associatedGame,
        recurrence,
        time,
        status,
      });
    }
    onClose();
  };

  // ── Floating placement: portal + viewport-aware coordinates ───────────────
  // Some triggers live inside containers with `overflow-hidden` (e.g. the
  // Schedule table wrapper), which would clip a normal `position: absolute`
  // popover. To avoid editing those wrappers (which would break their rounded
  // corners / scrolling), we render the floating popover into a body-level
  // portal and compute fixed coordinates from the anchor's bounding box.
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);
  // Recompute the anchor rect on mount and on window resize/scroll so the
  // popover stays glued to the trigger if the user scrolls the schedules table.
  useEffect(() => {
    if (placement !== 'floating') return;
    const update = () => {
      const rect = anchorRef.current?.getBoundingClientRect() ?? null;
      setAnchorRect(rect);
    };
    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [placement, anchorRef]);

  const POPOVER_WIDTH_PX = 320; // matches Tailwind w-80
  const VIEWPORT_PADDING_PX = 8;

  const floatingStyle: React.CSSProperties | undefined =
    placement === 'floating' && anchorRect
      ? (() => {
          // Right-align with the anchor by default. If that would clip past
          // the left edge of the viewport, fall back to left-aligning.
          const rightEdge = anchorRect.right;
          let left = rightEdge - POPOVER_WIDTH_PX;
          if (left < VIEWPORT_PADDING_PX) left = VIEWPORT_PADDING_PX;
          // Also clamp to keep the popover inside the right edge.
          const maxLeft =
            window.innerWidth - POPOVER_WIDTH_PX - VIEWPORT_PADDING_PX;
          if (left > maxLeft) left = maxLeft;
          // Vertical clamp: if the trigger sits near the bottom of the
          // viewport, the popover would otherwise spill out and be unreachable.
          // We pin `top` between the padding and `viewportH - padding` and
          // delegate the rest to a `max-height` + internal scrollbar so the
          // user can always reach the Save/Cancel buttons.
          const viewportH = window.innerHeight;
          let top = anchorRect.bottom + 8;
          if (top > viewportH - VIEWPORT_PADDING_PX - 100) {
            // Keep at least 100px of room; the inner overflow scroll handles
            // the rest.
            top = Math.max(VIEWPORT_PADDING_PX, viewportH - 100);
          }
          const maxHeight = viewportH - top - VIEWPORT_PADDING_PX;
          return {
            position: 'fixed',
            top,
            left,
            width: POPOVER_WIDTH_PX,
            maxHeight,
          };
        })()
      : undefined;

  const panel = (
    <div
      ref={popoverRef}
      role="dialog"
      aria-modal="false"
      aria-labelledby={`${formId}-title`}
      style={floatingStyle}
      className={cn(
        'schedule-popover-scroll z-50 overflow-y-auto rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-lg',
        // Sidebar placement keeps the previous DOM-flow positioning so the
        // popover scrolls with the project list. We bound its height to the
        // viewport (minus reasonable padding) so the inner content never
        // pushes Save/Cancel below the visible area.
        placement === 'sidebar' &&
          'absolute left-0 top-full mt-2 w-80 max-h-[calc(100vh-6rem)]',
        // Floating placement uses inline `style` for top/left/width and an
        // explicit `maxHeight` from `floatingStyle` above.
      )}
    >
      {!compact && (
        <header className="mb-3">
          <p
            id={`${formId}-title`}
            className="truncate text-sm font-semibold text-[var(--color-charcoal)]"
            title={project.name}
          >
            {project.name}
          </p>
          <p
            className="truncate text-xs text-[var(--color-muted)]"
            title={associatedGame}
          >
            Game: {associatedGame}
          </p>
        </header>
      )}

      <PreviewNotice variant="compact" className="mb-3" />

      <ScheduledPipelineCard variant="inline" className="mb-3" />

      <div className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-[var(--color-muted)]">Recurrence</span>
          <select
            value={recurrence}
            onChange={(e) =>
              setRecurrence(e.target.value as ProjectSchedule['recurrence'])
            }
            className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-charcoal)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
          >
            {RECURRENCES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="text-[var(--color-muted)]">Time</span>
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-charcoal)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="text-[var(--color-muted)]">Status</span>
          <select
            value={status}
            onChange={(e) =>
              setStatus(e.target.value as ProjectSchedule['status'])
            }
            className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-charcoal)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
      </div>

      <footer className="mt-4 flex items-center justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onClose}>
          Cancel
        </Button>
        <Button type="button" variant="primary" size="sm" onClick={handleSave}>
          {existing ? 'Update Schedule' : 'Save Schedule'}
        </Button>
      </footer>
    </div>
  );

  // For floating placement, mount into a body-level portal so the popover
  // escapes any ancestor with `overflow-hidden` / `transform`. SSR-safe: we
  // skip the portal until `document` is available.
  if (placement === 'floating') {
    if (typeof document === 'undefined') return null;
    // Don't render until we have a measured anchor rect — prevents a
    // single-frame flash at (0, 0) before the layout effect runs.
    if (!anchorRect) return null;
    return createPortal(panel, document.body);
  }

  return panel;
}
