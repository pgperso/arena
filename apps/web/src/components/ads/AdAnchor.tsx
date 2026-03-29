'use client';

import { useState, useEffect } from 'react';
import { AdSlot } from './AdSlot';

export function AdAnchor() {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // Show after 5 seconds delay
  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 5000);
    return () => clearTimeout(timer);
  }, []);

  // Auto-hide after 30 seconds without interaction
  useEffect(() => {
    if (!visible || dismissed) return;
    const timer = setTimeout(() => setDismissed(true), 30000);
    return () => clearTimeout(timer);
  }, [visible, dismissed]);

  if (!visible || dismissed) return null;

  return (
    <div className="shrink-0 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1e1e1e] lg:hidden">
      <div className="relative flex justify-center py-1">
        <button
          onClick={() => setDismissed(true)}
          className="absolute right-1 top-1 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-gray-700 text-sm font-bold text-white shadow transition hover:bg-gray-600"
          aria-label="Fermer la publicité"
        >
          &times;
        </button>
        <AdSlot slotId="mobile-anchor" format="large-mobile-banner" className="w-full max-w-md" />
      </div>
    </div>
  );
}
