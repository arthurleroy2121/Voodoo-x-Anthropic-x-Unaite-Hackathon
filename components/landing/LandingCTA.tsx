'use client';

import { useRouter } from 'next/navigation';

import { useApp } from '@/lib/state';

export function LandingCTA() {
  const router = useRouter();
  const projectName = useApp((s) => s.projectName);
  const setProjectName = useApp((s) => s.setProjectName);

  function handleStart() {
    if (!projectName) setProjectName('Mon Projet');
    router.push('/project');
  }

  return (
    <div className="flex justify-center px-8 pb-12">
      <button
        type="button"
        onClick={handleStart}
        className="inline-flex items-center gap-2 rounded-md bg-accent px-6 py-3 text-base font-medium text-white shadow-sm transition-colors hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
      >
        Get Started
      </button>
    </div>
  );
}
