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
    <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-ad-border bg-ad-bg lg:hidden">
      <div className="relative flex justify-center py-1">
        <button
          onClick={() => setDismissed(true)}
          className="absolute -top-6 right-2 flex h-6 w-6 items-center justify-center rounded-full bg-gray-800/70 text-xs text-white transition hover:bg-gray-800"
          aria-label="Fermer la publicité"
        >
          &times;
        </button>
        <AdSlot slotId="mobile-anchor" format="large-mobile-banner" className="w-full max-w-md" />
      </div>
    </div>
  );
}
