import { Hero } from '@/components/landing/Hero';
import { LandingCTA } from '@/components/landing/LandingCTA';
import { WorkflowCards } from '@/components/landing/WorkflowCards';

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-[--color-bg]">
      <Hero />
      <LandingCTA />
      <WorkflowCards />
    </main>
  );
}
