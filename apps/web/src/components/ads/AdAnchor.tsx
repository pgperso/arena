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
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1e1e1e] shadow-[0_-2px_8px_rgba(0,0,0,0.1)] lg:hidden pb-safe">
      <div className="relative flex justify-center py-1">
        <button
          onClick={() => setDismissed(true)}
          className="absolute -top-3 right-2 flex h-6 w-6 items-center justify-center rounded-full bg-gray-800 text-xs text-white shadow transition hover:bg-gray-700"
          aria-label="Fermer la publicité"
        >
          &times;
        </button>
        <AdSlot slotId="mobile-anchor" format="large-mobile-banner" className="w-full max-w-md" />
      </div>
    </div>
  );
}
