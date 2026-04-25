import { AppShell } from '@/components/layout/AppShell';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopBar } from '@/components/layout/TopBar';
import { WorkflowTabs } from '@/components/layout/WorkflowTabs';

export default function ProjectPage() {
  return (
    <AppShell sidebar={<Sidebar />} topbar={<TopBar />}>
      <WorkflowTabs />
    </AppShell>
  );
}
