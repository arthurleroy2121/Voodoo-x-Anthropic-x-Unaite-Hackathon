'use client';

import { useRouter } from 'next/navigation';

import { useApp } from '@/lib/state';

export function LandingCTA() {
  const router = useRouter();
  const projects = useApp((s) => s.projects);
  const addProject = useApp((s) => s.addProject);

  function handleStart() {
    if (!projects || projects.length === 0) addProject('Demo Project');
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
