import { AppShell } from '@/components/layout/AppShell';
import { Sidebar } from '@/components/layout/Sidebar';
import { SchedulePage } from '@/components/schedule/SchedulePage';

/**
 * /schedule — dedicated full-page view of the Schedule preview feature.
 *
 * Intentionally renders WITHOUT the `TopBar`: that header advertises the
 * "current project" context, which is irrelevant on this cross-project page.
 */
export default function ScheduleRoute() {
  return (
    <AppShell sidebar={<Sidebar />}>
      <SchedulePage />
    </AppShell>
  );
}
