'use client';

import { useEffect } from 'react';

import { useApp } from '@/lib/state';

export function StoreHydrator() {
  useEffect(() => {
    useApp.persist.rehydrate();
  }, []);

  return null;
}
