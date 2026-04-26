import { AppShell } from '@/components/layout/AppShell';
import { Sidebar } from '@/components/layout/Sidebar';
import { Hero } from '@/components/landing/Hero';
import { LandingCTA } from '@/components/landing/LandingCTA';
import { WorkflowCards } from '@/components/landing/WorkflowCards';

export default function LandingPage() {
  return (
    <AppShell sidebar={<Sidebar />}>
      <Hero />
      <LandingCTA />
      <WorkflowCards />
    </AppShell>
  );
}
